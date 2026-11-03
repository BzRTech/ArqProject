from django.urls import path

from . import views

auth_urls = [
    path("csrf/", views.CsrfView.as_view(), name="auth-csrf"),
    path("login/", views.LoginView.as_view(), name="auth-login"),
    path("logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("signup/", views.SignUpView.as_view(), name="auth-signup"),
    path("me/", views.MeView.as_view(), name="auth-me"),
]

org_urls = [
    path("current/", views.CurrentOrganizationView.as_view(), name="org-current"),
    path("switch/", views.SwitchOrganizationView.as_view(), name="org-switch"),
]
