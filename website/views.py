from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from datetime import datetime, date
import calendar
from .models import Task


def home(request):
	context = {}
	if request.user.is_authenticated:
		# Get current month and year, or from URL parameters
		month = int(request.GET.get('month', datetime.now().month))
		year = int(request.GET.get('year', datetime.now().year))
		
		# Create calendar
		cal = calendar.Calendar(firstweekday=6)  # Start week on Sunday
		month_days = cal.monthdayscalendar(year, month)
		
		# Get month and year names
		month_name = calendar.month_name[month]
		
		# Calculate previous and next month/year
		if month == 1:
			prev_month, prev_year = 12, year - 1
		else:
			prev_month, prev_year = month - 1, year
			
		if month == 12:
			next_month, next_year = 1, year + 1
		else:
			next_month, next_year = month + 1, year
		
		context = {
			'month_days': month_days,
			'month_name': month_name,
			'month': month,
			'year': year,
			'prev_month': prev_month,
			'prev_year': prev_year,
			'next_month': next_month,
			'next_year': next_year,
			'today': date.today(),
		}
	
	return render(request, 'home.html', context)


def login_user(request):
	if request.method == 'POST':
		username = request.POST['username']
		password = request.POST['password']
		user = authenticate(request, username=username, password=password)
		if user is not None:
			login(request, user)
			messages.success(request, 'You have been logged in successfully!')
			return redirect('home')
		else:
			messages.error(request, 'Invalid username or password.')
			return redirect('login')
	return render(request, 'login.html', {})


def logout_user(request):
	logout(request)
	messages.success(request, 'You have been logged out successfully!')
	return redirect('home')


def register_user(request):
	if request.method == 'POST':
		username = request.POST['username']
		email = request.POST['email']
		password1 = request.POST['password1']
		password2 = request.POST['password2']
		
		if password1 == password2:
			if User.objects.filter(username=username).exists():
				messages.error(request, 'Username already exists.')
				return redirect('register')
			elif User.objects.filter(email=email).exists():
				messages.error(request, 'Email already registered.')
				return redirect('register')
			else:
				user = User.objects.create_user(username=username, email=email, password=password1)
				messages.success(request, 'Account created successfully! You can now log in.')
				return redirect('login')
		else:
			messages.error(request, 'Passwords do not match.')
			return redirect('register')
	return render(request, 'register.html', {})


@login_required
def day_detail(request, year, month, day):
	selected_date = date(year, month, day)
	
	# Get or create tasks for each hour (4am to 10pm)
	tasks = {}
	for hour in range(4, 23):  # 4am to 10pm
		task, created = Task.objects.get_or_create(
			user=request.user,
			date=selected_date,
			hour=hour,
			defaults={'task_text': ''}
		)
		tasks[hour] = task
	
	context = {
		'selected_date': selected_date,
		'date_str': selected_date.strftime('%B %d, %Y'),
		'tasks': tasks,
	}
	return render(request, 'day_detail.html', context)


@login_required
def save_task(request):
	if request.method == 'POST':
		try:
			task_id = request.POST.get('task_id')
			task_text = request.POST.get('task_text', '')
			
			task = get_object_or_404(Task, id=task_id, user=request.user)
			task.task_text = task_text
			task.save()
			
			return JsonResponse({'status': 'success', 'message': 'Task saved successfully!'})
		except Exception as e:
			return JsonResponse({'status': 'error', 'message': str(e)})
	
	return JsonResponse({'status': 'error', 'message': 'Invalid request'})