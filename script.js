"use strict";

const themeToggle = document.getElementById("themeToggle");
const welcomeBtn = document.getElementById("welcomeBtn");
const welcomeMessage = document.getElementById("welcomeMessage");
const year = document.getElementById("year");

year.textContent = new Date().getFullYear();

themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  themeToggle.textContent = isDark ? "☀️" : "🌙";
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute("aria-label", isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن");
});

welcomeBtn.addEventListener("click", () => {
  welcomeMessage.textContent = "أهلًا وسهلًا بك! 🎉 نتمنى لك رحلة ممتعة في تطوير الويب.";
});