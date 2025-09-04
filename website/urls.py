from django.urls import path
from . import views

urlpatterns = [
	path('', views.home, name='home'),
	path('login/', views.login_user, name='login'),
	path('logout/', views.logout_user, name='logout'),
	path('register/', views.register_user, name='register'),
	path('day/<int:year>/<int:month>/<int:day>/', views.day_detail, name='day_detail'),
	path('save-task/', views.save_task, name='save_task'),
]
