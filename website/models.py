from django.db import models
from django.contrib.auth.models import User


class Task(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    date = models.DateField()
    hour = models.IntegerField(choices=[(i, f"{i}:00") for i in range(4, 23)])  # 4am to 10pm
    task_text = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'date', 'hour')
        ordering = ['date', 'hour']

    def __str__(self):
        hour_display = "12 AM" if self.hour == 0 else f"{self.hour} AM" if self.hour < 12 else f"{self.hour - 12} PM" if self.hour > 12 else "12 PM"
        return f"{self.user.username} - {self.date} at {hour_display}"

    def get_hour_display(self):
        if self.hour == 0:
            return "12:00 AM"
        elif self.hour < 12:
            return f"{self.hour}:00 AM"
        elif self.hour == 12:
            return "12:00 PM"
        else:
            return f"{self.hour - 12}:00 PM"
