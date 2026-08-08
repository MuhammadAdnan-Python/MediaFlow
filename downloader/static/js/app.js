
const urlInput = document.getElementById("mediaUrl");
const analyzeBtn = document.getElementById("analyzeBtn");

const toast = document.getElementById("toast");
const toastMessage = document.getElementById("toastMessage");

const themeBtn = document.getElementById("themeBtn");

const resultSection = document.getElementById("resultSection");
const resultThumbnail = document.getElementById("resultThumbnail");
const resultTitle = document.getElementById("resultTitle");
const resultUploader = document.getElementById("resultUploader");
const resultDuration = document.getElementById("resultDuration");

const downloadBtn = document.getElementById("downloadBtn");

const downloadProgressBox =
    document.getElementById("downloadProgressBox");

const downloadStatus =
    document.getElementById("downloadStatus");

const downloadPercentage =
    document.getElementById("downloadPercentage");

const downloadProgressBar =
    document.getElementById("downloadProgressBar");

const downloadSize =
    document.getElementById("downloadSize");

const downloadSpeed =
    document.getElementById("downloadSpeed");

const downloadEta =
    document.getElementById("downloadEta");

const qualityOptions =
    document.getElementById("qualityOptions");


let selectedFormat = null;


// ========================================
// SMOOTH DISPLAY PROGRESS
// ========================================

let displayProgress = 0;
let progressTimer = null;
let downloadFinished = false;


// ========================================
// START SMOOTH PROGRESS
// ========================================

function startSmoothProgress() {

    stopSmoothProgress();

    displayProgress = 0;

    downloadFinished = false;


    progressTimer = setInterval(() => {

        if (downloadFinished) {

            return;

        }


        // ========================================
        // NEVER GO ABOVE 95%
        // ========================================

        if (displayProgress < 95) {

            if (displayProgress < 20) {

                displayProgress += 1.2;

            }

            else if (displayProgress < 50) {

                displayProgress += 0.7;

            }

            else if (displayProgress < 75) {

                displayProgress += 0.35;

            }

            else {

                displayProgress += 0.12;

            }


            displayProgress =
                Math.min(
                    displayProgress,
                    95
                );


            if (downloadPercentage) {

                downloadPercentage.textContent =
                    `${displayProgress.toFixed(1)}%`;

            }


            if (downloadProgressBar) {

                downloadProgressBar.classList.remove(
                    "indeterminate"
                );

                downloadProgressBar.style.width =
                    `${displayProgress}%`;

            }

        }

    }, 150);

}


// ========================================
// STOP SMOOTH PROGRESS
// ========================================

function stopSmoothProgress() {

    if (progressTimer) {

        clearInterval(
            progressTimer
        );

        progressTimer = null;

    }

}


// ========================================
// COMPLETE PROGRESS
// ========================================

function finishSmoothProgress() {

    downloadFinished = true;

    stopSmoothProgress();

    displayProgress = 100;


    if (downloadPercentage) {

        downloadPercentage.textContent =
            "100%";

    }


    if (downloadProgressBar) {

        downloadProgressBar.classList.remove(
            "indeterminate"
        );

        downloadProgressBar.style.width =
            "100%";

    }

}


// ========================================
// CSRF TOKEN
// ========================================

function getCsrfToken() {

    const csrfElement =
        document.querySelector(
            "[name=csrfmiddlewaretoken]"
        );


    if (!csrfElement) {

        throw new Error(
            "CSRF token not found."
        );

    }


    return csrfElement.value;

}


// ========================================
// TOAST
// ========================================

function showToast(message) {

    if (!toast || !toastMessage) {

        return;

    }


    toastMessage.textContent =
        message;


    toast.classList.add(
        "show"
    );


    setTimeout(() => {

        toast.classList.remove(
            "show"
        );

    }, 3500);

}


// ========================================
// FORMAT BYTES
// ========================================

function formatBytes(bytes) {

    if (!bytes || bytes <= 0) {

        return "0 MB";

    }


    const units = [
        "B",
        "KB",
        "MB",
        "GB"
    ];


    let index = 0;

    let value = bytes;


    while (
        value >= 1024 &&
        index < units.length - 1
    ) {

        value =
            value / 1024;

        index++;

    }


    return `${value.toFixed(1)} ${units[index]}`;

}


// ========================================
// FORMAT SPEED
// ========================================

function formatSpeed(bytesPerSecond) {

    if (
        !bytesPerSecond ||
        bytesPerSecond <= 0
    ) {

        return "0 MB/s";

    }


    return `${formatBytes(
        bytesPerSecond
    )}/s`;

}


// ========================================
// FORMAT ETA
// ========================================

function formatEta(seconds) {

    if (
        seconds === null ||
        seconds === undefined ||
        seconds < 0
    ) {

        return "--:--";

    }


    seconds =
        Math.floor(seconds);


    const minutes =
        Math.floor(
            seconds / 60
        );


    const remainingSeconds =
        seconds % 60;


    return `${String(minutes).padStart(
        2,
        "0"
    )}:${String(
        remainingSeconds
    ).padStart(
        2,
        "0"
    )}`;

}


// ========================================
// FORMAT DURATION
// ========================================

function formatDuration(seconds) {

    if (!seconds) {

        return "Unknown";

    }


    const hours =
        Math.floor(
            seconds / 3600
        );


    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );


    const secondsRemaining =
        Math.floor(
            seconds % 60
        );


    if (hours > 0) {

        return `${hours}:${String(
            minutes
        ).padStart(
            2,
            "0"
        )}:${String(
            secondsRemaining
        ).padStart(
            2,
            "0"
        )}`;

    }


    return `${minutes}:${String(
        secondsRemaining
    ).padStart(
        2,
        "0"
    )}`;

}


// ========================================
// SHOW PROGRESS BOX
// ========================================

function showProgressBox() {

    if (!downloadProgressBox) {

        return;

    }


    downloadProgressBox.style.display =
        "block";

}


// ========================================
// HIDE PROGRESS BOX
// ========================================

function hideProgressBox() {

    if (!downloadProgressBox) {

        return;

    }


    downloadProgressBox.style.display =
        "none";

}


// ========================================
// UPDATE PROGRESS UI
// ========================================

function updateProgressUI(task) {

    if (!task) {

        return;

    }


    showProgressBox();


    // ========================================
    // STATUS
    // ========================================

    if (downloadStatus) {

        if (
            task.status === "preparing"
        ) {

            downloadStatus.textContent =
                "Preparing download...";

        }

        else if (
            task.status === "starting"
        ) {

            downloadStatus.textContent =
                "Starting download...";

        }

        else if (
            task.status === "downloading"
        ) {

            downloadStatus.textContent =
                "Downloading...";

        }

        else if (
            task.status === "processing"
        ) {

            downloadStatus.textContent =
                "Processing video...";

        }

        else if (
            task.status === "completed"
        ) {

            downloadStatus.textContent =
                "Download completed!";

        }

    }


    // ========================================
    // REAL PROGRESS
    // ========================================

    const progressKnown =
        task.progress_known === true &&
        task.progress !== null &&
        task.progress !== undefined;


    /*
     * IMPORTANT:
     *
     * We DO NOT directly set the visible
     * progress here while downloading.
     *
     * Smooth fake progress handles that.
     *
     * This prevents:
     *
     * 0% -> 100%
     *
     * on very small/fast files.
     */


    if (
        task.status === "completed"
    ) {

        finishSmoothProgress();

    }


    // ========================================
    // DOWNLOAD SIZE
    // ========================================

    if (downloadSize) {

        const downloaded =
            Number(
                task.downloaded || 0
            );


        const total =
            Number(
                task.total || 0
            );


        if (total > 0) {

            downloadSize.textContent =
                `${formatBytes(
                    downloaded
                )} / ${formatBytes(
                    total
                )}`;

        }

        else if (downloaded > 0) {

            downloadSize.textContent =
                `${formatBytes(
                    downloaded
                )} / Calculating...`;

        }

        else {

            downloadSize.textContent =
                "Preparing File Size....";

        }

    }


    // ========================================
    // SPEED
    // ========================================

    if (downloadSpeed) {

        downloadSpeed.textContent =
            formatSpeed(
                task.speed || 0
            );

    }


    // ========================================
    // ETA
    // ========================================

    if (downloadEta) {

        if (
            task.eta !== null &&
            task.eta !== undefined &&
            task.eta >= 0
        ) {

            downloadEta.textContent =
                formatEta(
                    task.eta
                );

        }

        else {

            downloadEta.textContent =
                "--:--";

        }

    }

}


// ========================================
// QUALITY BUTTONS
// ========================================

function createQualityButtons(formats) {

    qualityOptions.innerHTML =
        "";

    selectedFormat =
        null;


    const uniqueFormats =
        [];


    formats.forEach((format) => {

        if (!format.height) {

            return;

        }


        if (
            !uniqueFormats.some(
                item =>
                    item.height ===
                    format.height
            )
        ) {

            uniqueFormats.push(
                format
            );

        }

    });


    // Highest quality first

    uniqueFormats.sort(
        (a, b) =>
            b.height - a.height
    );


    uniqueFormats.forEach(
        (format, index) => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "quality-btn";


            if (index === 0) {

                button.classList.add(
                    "active"
                );


                selectedFormat =
                    format;

            }


            button.dataset.formatId =
                format.format_id;


            button.innerHTML = `
                <strong>${format.height}p</strong>
                <small>${(
                    format.ext || "mp4"
                ).toUpperCase()}</small>
            `;


            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".quality-btn"
                        )
                        .forEach(
                            btn => {

                                btn.classList.remove(
                                    "active"
                                );

                            }
                        );


                    button.classList.add(
                        "active"
                    );


                    selectedFormat =
                        format;


                    console.log(
                        "Selected format:",
                        selectedFormat
                    );

                }
            );


            qualityOptions.appendChild(
                button
            );

        }
    );


    if (
        uniqueFormats.length === 0
    ) {

        qualityOptions.innerHTML =
            "<p>No downloadable qualities found.</p>";

    }

}


// ========================================
// ANALYZE BUTTON
// ========================================

analyzeBtn.addEventListener(
    "click",
    async () => {

        const url =
            urlInput.value.trim();


        if (!url) {

            showToast(
                "Please paste an authorized URL first."
            );

            urlInput.focus();

            return;

        }


        // ========================================
        // URL VALIDATION
        // ========================================

        try {

            new URL(url);

        }

        catch {

            showToast(
                "Please enter a valid URL."
            );

            urlInput.focus();

            return;

        }


        // ========================================
        // ANALYZE LOADING
        // ========================================

        analyzeBtn.disabled =
            true;


        const text =
            analyzeBtn.querySelector(
                "span:first-child"
            );


        const arrow =
            analyzeBtn.querySelector(
                ".arrow"
            );


        if (text) {

            text.textContent =
                "Analyzing...";

        }


        if (arrow) {

            arrow.textContent =
                "⏳";

        }


        try {

            const formData =
                new FormData();


            formData.append(
                "url",
                url
            );


            const response =
                await fetch(
                    "/analyze/",
                    {

                        method: "POST",

                        headers: {

                            "X-CSRFToken":
                                getCsrfToken()

                        },

                        body:
                            formData

                    }
                );


            const data =
                await response.json();


            console.log(
                "Backend Response:",
                data
            );


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.error ||
                    "Something went wrong."
                );

            }


            // ========================================
            // QUALITY BUTTONS
            // ========================================

            createQualityButtons(
                data.formats || []
            );


            // ========================================
            // RESULT INFO
            // ========================================

            resultTitle.textContent =
                data.title ||
                "Unknown Title";


            resultUploader.textContent =
                data.uploader ||
                "Unknown";


            resultDuration.textContent =
                formatDuration(
                    data.duration
                );


            // ========================================
            // THUMBNAIL
            // ========================================

            if (data.thumbnail) {

                resultThumbnail.src =
                    data.thumbnail;

                resultThumbnail.style.display =
                    "block";

            }

            else {

                resultThumbnail.style.display =
                    "none";

            }


            // ========================================
            // SHOW RESULT
            // ========================================

            resultSection.classList.add(
                "show"
            );


            setTimeout(() => {

                resultSection.scrollIntoView({

                    behavior:
                        "smooth",

                    block:
                        "center"

                });

            }, 150);

        }


        catch (error) {

            console.error(
                "Analyze Error:",
                error
            );


            showToast(
                error.message
            );

        }


        // ========================================
        // RESET ANALYZE
        // ========================================

        analyzeBtn.disabled =
            false;


        if (text) {

            text.textContent =
                "Analyze";

        }


        if (arrow) {

            arrow.textContent =
                "→";

        }

    }
);


// ========================================
// ENTER KEY
// ========================================

urlInput.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Enter"
        ) {

            analyzeBtn.click();

        }

    }
);


// ========================================
// CHECK DOWNLOAD PROGRESS
// ========================================

async function checkDownloadProgress(
    taskId
) {

    try {

        const response =
            await fetch(
                `/download/progress/${taskId}/`
            );


        const data =
            await response.json();


        console.log(
            "Download Progress:",
            data
        );


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.error ||
                "Could not get download progress."
            );

        }


        const task =
            data.task;


        if (!task) {

            throw new Error(
                "Download task information not found."
            );

        }


        // ========================================
        // UPDATE UI
        // ========================================

        updateProgressUI(
            task
        );


        // ========================================
        // PREPARING
        // ========================================

        if (
            task.status === "preparing"
        ) {

            downloadBtn.textContent =
                "Preparing download...";

        }


        // ========================================
        // STARTING
        // ========================================

        else if (
            task.status === "starting"
        ) {

            downloadBtn.textContent =
                "Preparing download...";

        }


        // ========================================
        // DOWNLOADING
        // ========================================

        else if (
            task.status === "downloading"
        ) {

            downloadBtn.textContent =
                "Downloading...";

        }


        // ========================================
        // PROCESSING
        // ========================================

        else if (
            task.status === "processing"
        ) {

            downloadBtn.textContent =
                "Processing video...";

        }


        // ========================================
        // COMPLETED
        // ========================================

        else if (
            task.status === "completed"
        ) {

            finishSmoothProgress();


            downloadBtn.textContent =
                "Download ready";


            if (downloadStatus) {

                downloadStatus.textContent =
                    "Download completed!";

            }


            /*
             * Give the browser a tiny moment
             * to display 100%.
             */

            setTimeout(() => {

                window.location.href =
                    `/download/file/${taskId}/`;

            }, 400);


            return;

        }


        // ========================================
        // ERROR
        // ========================================

        else if (
            task.status === "error"
        ) {

            throw new Error(
                task.error ||
                "Download failed."
            );

        }


        // ========================================
        // CHECK AGAIN
        // ========================================

        setTimeout(() => {

            checkDownloadProgress(
                taskId
            );

        }, 300);

    }


    catch (error) {

        console.error(
            "Progress Error:",
            error
        );


        stopSmoothProgress();


        downloadBtn.disabled =
            false;


        downloadBtn.textContent =
            "Download";


        showToast(
            error.message
        );

    }

}


// ========================================
// DOWNLOAD BUTTON
// ========================================

downloadBtn.addEventListener(
    "click",
    async () => {

        if (!selectedFormat) {

            showToast(
                "Please select a quality first."
            );

            return;

        }


        const url =
            urlInput.value.trim();


        if (!url) {

            showToast(
                "Please enter a URL first."
            );

            return;

        }


        try {

            // ========================================
            // BUTTON STATE
            // ========================================

            downloadBtn.disabled =
                true;


            downloadBtn.textContent =
                "Preparing download...";


            // ========================================
            // SHOW PROGRESS BOX
            // ========================================

            showProgressBox();


            // ========================================
            // RESET PROGRESS
            // ========================================

            stopSmoothProgress();

            displayProgress =
                0;

            downloadFinished =
                false;


            if (downloadStatus) {

                downloadStatus.textContent =
                    "Preparing download...";

            }


            if (downloadPercentage) {

                downloadPercentage.textContent =
                    "0%";

            }


            if (downloadProgressBar) {

                downloadProgressBar.classList.remove(
                    "indeterminate"
                );

                downloadProgressBar.style.width =
                    "0%";

            }


            if (downloadSize) {

                downloadSize.textContent =
                    "Preparing File Size....";

            }


            if (downloadSpeed) {

                downloadSpeed.textContent =
                    "Good";

            }


            if (downloadEta) {

                downloadEta.textContent =
                    "--:--";

            }


            // ========================================
            // START BACKGROUND TASK
            // ========================================

            const response =
                await fetch(
                    "/download/",
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "X-CSRFToken":
                                getCsrfToken()

                        },

                        body:
                            JSON.stringify({

                                url:
                                    url,

                                format_id:
                                    selectedFormat.format_id

                            })

                    }
                );


            const data =
                await response.json();


            console.log(
                "Download Start:",
                data
            );


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.error ||
                    "Could not start download."
                );

            }


            // ========================================
            // TASK ID
            // ========================================

            const taskId =
                data.task_id;


            if (!taskId) {

                throw new Error(
                    "Task ID was not returned."
                );

            }


            // ========================================
            // START SMOOTH DISPLAY
            // ========================================

            startSmoothProgress();


            // ========================================
            // START REAL BACKEND POLLING
            // ========================================

            checkDownloadProgress(
                taskId
            );

        }


        catch (error) {

            console.error(
                "Download Error:",
                error
            );


            stopSmoothProgress();


            downloadBtn.disabled =
                false;


            downloadBtn.textContent =
                "Download";


            hideProgressBox();


            showToast(
                error.message
            );

        }

    }
);


// ========================================
// THEME BUTTON
// ========================================

themeBtn.addEventListener(
    "click",
    () => {

        showToast(
            "Theme controls will be connected later."
        );

    }
);
