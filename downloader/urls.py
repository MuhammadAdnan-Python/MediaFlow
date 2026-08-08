
from django.urls import path
from . import views


urlpatterns = [

    # ========================================
    # HOME
    # ========================================

    path(
        "",
        views.home,
        name="home"
    ),


    # ========================================
    # ANALYZE
    # ========================================

    path(
        "analyze/",
        views.analyze_url,
        name="analyze"
    ),


    # ========================================
    # START DOWNLOAD
    # ========================================

    path(
        "download/",
        views.download_media,
        name="download"
    ),


    # ========================================
    # DOWNLOAD PROGRESS
    # ========================================

    path(
        "download/progress/<str:task_id>/",
        views.get_download_progress,
        name="download_progress"
    ),


    # ========================================
    # FINAL FILE DOWNLOAD
    # ========================================

    path(
        "download/file/<str:task_id>/",
        views.download_file,
        name="download_file"
    ),

]

