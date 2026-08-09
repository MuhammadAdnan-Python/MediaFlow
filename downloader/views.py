
from django.conf import settings
from django.shortcuts import render
from django.http import JsonResponse, FileResponse

import yt_dlp
import os
import threading
import uuid
import json


# ========================================
# FFMPEG LOCATION
# ========================================

FFMPEG_PATH = r"D:\ffmpeg-master-latest-win64-gpl-shared\bin"

COOKIE_FILE_PATH = os.path.join(settings.BASE_DIR, "cookies.txt")


# ========================================
# DOWNLOAD PROGRESS STORAGE
# ========================================

download_tasks = {}

download_lock = threading.Lock()


# ========================================
# UPDATE TASK SAFELY
# ========================================

def update_task(task_id, data):

    with download_lock:

        download_tasks[task_id] = data.copy()


# ========================================
# PROGRESS HOOK
# ========================================

def progress_hook(task_id, data):

    status = data.get("status")


    # ========================================
    # DOWNLOADING
    # ========================================

    if status == "downloading":

        downloaded_bytes = (
            data.get("downloaded_bytes")
            or 0
        )

        total_bytes = (
            data.get("total_bytes")
            or data.get("total_bytes_estimate")
            or 0
        )

        speed = (
            data.get("speed")
            or 0
        )

        eta = data.get("eta")


        # ====================================
        # REAL PROGRESS
        # ====================================

        if total_bytes > 0:

            percentage = (
                downloaded_bytes /
                total_bytes
            ) * 100

            percentage = min(
                percentage,
                99.9
            )

            update_task(
                task_id,
                {

                    "status":
                        "downloading",

                    "progress":
                        round(
                            percentage,
                            1
                        ),

                    "downloaded":
                        downloaded_bytes,

                    "total":
                        total_bytes,

                    "speed":
                        speed,

                    "eta":
                        eta
                        if eta is not None
                        else -1,

                    "progress_known":
                        True,

                }
            )


        # ====================================
        # UNKNOWN SIZE
        # ====================================

        else:

            update_task(
                task_id,
                {

                    "status":
                        "downloading",

                    "progress":
                        None,

                    "downloaded":
                        downloaded_bytes,

                    "total":
                        0,

                    "speed":
                        speed,

                    "eta":
                        -1,

                    "progress_known":
                        False,

                }
            )


    # ========================================
    # DOWNLOAD FINISHED
    # ========================================

    elif status == "finished":

        downloaded_bytes = (
            data.get(
                "downloaded_bytes",
                0
            )
        )

        total_bytes = (
            data.get(
                "total_bytes",
                0
            )
        )


        update_task(
            task_id,
            {

                "status":
                    "processing",

                "progress":
                    99.9,

                "downloaded":
                    downloaded_bytes,

                "total":
                    total_bytes,

                "speed":
                    0,

                "eta":
                    0,

                "progress_known":
                    total_bytes > 0,

            }
        )


# ========================================
# RUN DOWNLOAD
# ========================================

def run_download(
    task_id,
    url,
    format_id
):

    try:

        # ====================================
        # DOWNLOAD FOLDER
        # ====================================

        download_folder = os.path.join(
            "media",
            "downloads"
        )

        os.makedirs(
            download_folder,
            exist_ok=True
        )


        # ====================================
        # PREPARING
        # ====================================

        update_task(
            task_id,
            {

                "status":
                    "preparing",

                "progress":
                    None,

                "downloaded":
                    0,

                "total":
                    0,

                "speed":
                    0,

                "eta":
                    -1,

                "progress_known":
                    False,

            }
        )


        # ====================================
        # GET VIDEO INFORMATION
        # ====================================

        info_options = {

            "quiet":
                True,

            "no_warnings":
                True,

            "skip_download":
                True,

        }


        with yt_dlp.YoutubeDL(
            info_options
        ) as ydl:

            info = ydl.extract_info(
                url,
                download=False
            )


        # ====================================
        # FIND SELECTED FORMAT
        # ====================================

        selected_format = None


        for fmt in info.get(
            "formats",
            []
        ):

            if str(
                fmt.get("format_id")
            ) == str(format_id):

                selected_format = fmt

                break


        if not selected_format:

            update_task(
                task_id,
                {

                    "status":
                        "error",

                    "error":
                        "Selected format was not found."

                }
            )

            return


        # ====================================
        # CHECK AUDIO
        # ====================================

        has_audio = (
            selected_format.get(
                "acodec"
            ) != "none"
        )


        if has_audio:

            format_selector = str(
                format_id
            )

        else:

            format_selector = (
                f"{format_id}+bestaudio/best"
            )


        # ====================================
        # KNOWN FILE SIZE
        # ====================================

        known_size = (
            selected_format.get(
                "filesize"
            )
            or selected_format.get(
                "filesize_approx"
            )
            or 0
        )


        update_task(
            task_id,
            {

                "status":
                    "starting",

                "progress":
                    0 if known_size > 0 else None,

                "downloaded":
                    0,

                "total":
                    known_size,

                "speed":
                    0,

                "eta":
                    -1,

                "progress_known":
                    known_size > 0,

            }
        )


        # ====================================
        # YT-DLP OPTIONS
        # ====================================

        options = {

            "format":
                format_selector,

            "outtmpl":
                os.path.join(
                    download_folder,
                    "%(title)s.%(ext)s"
                ),

            "ffmpeg_location":
                FFMPEG_PATH,

            "merge_output_format":
                "mp4",

            "noplaylist":
                True,

            "quiet":
                True,

            "no_warnings":
                True,
            "cookiefile":
                COOKIE_FILE_PATH,

            "progress_hooks":
                [

                    lambda data:
                        progress_hook(
                            task_id,
                            data
                        )

                ],

        }


        # ====================================
        # ACTUAL DOWNLOAD
        # ====================================

        with yt_dlp.YoutubeDL(
            options
        ) as ydl:

            info = ydl.extract_info(
                url,
                download=True
            )

            filename = ydl.prepare_filename(
                info
            )


        # ====================================
        # PROCESSING
        # ====================================

        update_task(
            task_id,
            {

                "status":
                    "processing",

                "progress":
                    99.9,

                "downloaded":
                    0,

                "total":
                    0,

                "speed":
                    0,

                "eta":
                    0,

                "progress_known":
                    False,

            }
        )


        # ====================================
        # FIND FINAL FILE
        # ====================================

        base_name, extension = (
            os.path.splitext(
                filename
            )
        )


        possible_files = [

            base_name + ".mp4",

            filename,

        ]


        final_file = None


        for file_path in possible_files:

            if os.path.exists(
                file_path
            ):

                final_file = file_path

                break


        # ====================================
        # FILE NOT FOUND
        # ====================================

        if not final_file:

            update_task(
                task_id,
                {

                    "status":
                        "error",

                    "error":
                        "Downloaded file could not be found."

                }
            )

            return


        # ====================================
        # FINAL FILE SIZE
        # ====================================

        file_size = os.path.getsize(
            final_file
        )


        # ====================================
        # COMPLETE
        # ====================================

        update_task(
            task_id,
            {

                "status":
                    "completed",

                "progress":
                    100,

                "downloaded":
                    file_size,

                "total":
                    file_size,

                "speed":
                    0,

                "eta":
                    0,

                "progress_known":
                    True,

                "file":
                    final_file,

                "filename":
                    os.path.basename(
                        final_file
                    )

            }
        )


    except Exception as e:

        print(
            "DOWNLOAD ERROR:",
            str(e)
        )


        update_task(
            task_id,
            {

                "status":
                    "error",

                "error":
                    str(e)

            }
        )


# ========================================
# HOME
# ========================================

def home(request):

    return render(
        request,
        "downloader/home.html"
    )


# ========================================
# ANALYZE URL
# ========================================

def analyze_url(request):

    if request.method != "POST":

        return JsonResponse(
            {

                "success":
                    False,

                "error":
                    "Only POST requests are allowed."

            },
            status=405
        )


    url = request.POST.get(
        "url",
        ""
    ).strip()


    if not url:

        return JsonResponse(
            {

                "success":
                    False,

                "error":
                    "URL is required."

            },
            status=400
        )


    try:

        options = {
    "quiet": False,
    "no_warnings": False,
    "skip_download": True,
    "noplaylist": True,
    "cookiefile": COOKIE_FILE_PATH,

    "extractor_args": {
        "youtube": {
            "player_client": ["web_safari", "android"]
        }
    },
}


        with yt_dlp.YoutubeDL(
            options
        ) as ydl:

            info = ydl.extract_info(
                url,
                download=False
            )


        formats = []


        for fmt in info.get(
            "formats",
            []
        ):

            height = fmt.get(
                "height"
            )


            if not height:

                continue


            formats.append(
                {

                    "format_id":
                        fmt.get(
                            "format_id"
                        ),

                    "height":
                        height,

                    "ext":
                        fmt.get(
                            "ext"
                        ),

                    "filesize":
                        (
                            fmt.get(
                                "filesize"
                            )
                            or
                            fmt.get(
                                "filesize_approx"
                            )
                        ),

                    "has_video":
                        fmt.get(
                            "vcodec"
                        ) != "none",

                    "has_audio":
                        fmt.get(
                            "acodec"
                        ) != "none",

                }
            )


        return JsonResponse(
            {

                "success":
                    True,

                "title":
                    info.get(
                        "title"
                    ),

                "thumbnail":
                    info.get(
                        "thumbnail"
                    ),

                "duration":
                    info.get(
                        "duration"
                    ),

                "uploader":
                    info.get(
                        "uploader"
                    ),

                "formats":
                    formats,

            }
        )


    except Exception as e:

        print("ANALYZE ERROR:", str(e))

        return JsonResponse(
            {
                "success": False,
                "error": "Media analysis failed. Please try another supported URL."
            },
            status=400
        )


# ========================================
# START DOWNLOAD
# ========================================

def download_media(request):

    if request.method != "POST":

        return JsonResponse(
            {

                "success":
                    False,

                "error":
                    "Only POST requests are allowed."

            },
            status=405
        )


    try:

        data = json.loads(
            request.body
        )


        url = data.get(
            "url"
        )


        format_id = data.get(
            "format_id"
        )


        if not url:

            return JsonResponse(
                {

                    "success":
                        False,

                    "error":
                        "URL is required."

                },
                status=400
            )


        if not format_id:

            return JsonResponse(
                {

                    "success":
                        False,

                    "error":
                        "Format is required."

                },
                status=400
            )


        # ====================================
        # CREATE TASK ID
        # ====================================

        task_id = str(
            uuid.uuid4()
        )


        # ====================================
        # INITIAL STATE
        # ====================================

        update_task(
            task_id,
            {

                "status":
                    "preparing",

                "progress":
                    None,

                "downloaded":
                    0,

                "total":
                    0,

                "speed":
                    0,

                "eta":
                    -1,

                "progress_known":
                    False,

            }
        )


        # ====================================
        # BACKGROUND THREAD
        # ====================================

        thread = threading.Thread(

            target=run_download,

            args=(
                task_id,
                url,
                format_id
            )

        )


        thread.daemon = True

        thread.start()


        # ====================================
        # RETURN TASK ID
        # ====================================

        return JsonResponse(
            {

                "success":
                    True,

                "task_id":
                    task_id

            }
        )


    except Exception as e:

        return JsonResponse(
            {

                "success":
                    False,

                "error":
                    str(e)

            },
            status=400
        )


# ========================================
# DOWNLOAD PROGRESS
# ========================================

def get_download_progress(
    request,
    task_id
):

    with download_lock:

        task = download_tasks.get(
            task_id
        )


    if not task:

        return JsonResponse(
            {

                "success":
                    False,

                "error":
                    "Download task not found."

            },
            status=404
        )


    return JsonResponse(
        {

            "success":
                True,

            "task":
                task

        }
    )


# ========================================
# DOWNLOAD FINAL FILE
# ========================================

def download_file(
    request,
    task_id
):

    with download_lock:

        task = download_tasks.get(
            task_id
        )


    if not task:

        return JsonResponse(
            {

                "success":
                    False,

                "error":
                    "Download task not found."

            },
            status=404
        )


    if task.get(
        "status"
    ) != "completed":

        return JsonResponse(
            {

                "success":
                    False,

                "error":
                    "File is not ready yet."

            },
            status=400
        )


    file_path = task.get(
        "file"
    )


    if not file_path:

        return JsonResponse(
            {

                "success":
                    False,

                "error":
                    "File path not found."

            },
            status=404
        )


    if not os.path.exists(
        file_path
    ):

        return JsonResponse(
            {

                "success":
                    False,

                "error":
                    "File no longer exists."

            },
            status=404
        )


    response = FileResponse(

        open(
            file_path,
            "rb"
        ),

        as_attachment=True,

        filename=task.get(
            "filename",
            "download.mp4"
        )

    )


    return response

