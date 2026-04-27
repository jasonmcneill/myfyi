// My FYI Dashboard - Vanilla JS

const API_BASE = "/api";
let authToken = localStorage.getItem("token");

// Check auth
if (!authToken) {
  window.location.href = "/login.html";
}

// Tab switching
function showTab(tabName) {
  // Hide all tabs
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.add("hidden");
  });
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove(
      "active",
      "border-b-2",
      "border-purple-600",
      "font-semibold",
    );
    btn.classList.add("text-gray-600", "hover:text-purple-600");
  });

  // Show selected tab
  document.getElementById(`${tabName}-tab`).classList.remove("hidden");
  event.target.classList.add(
    "active",
    "border-b-2",
    "border-purple-600",
    "font-semibold",
  );
  event.target.classList.remove("text-gray-600", "hover:text-purple-600");

  // Load data for tab
  if (tabName === "analytics") {
    loadAnalytics();
  }
}

// Fetch with auth
async function fetchAPI(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login.html";
    }
    const error = await response.json();
    throw new Error(error.error || "API error");
  }

  return response.json();
}

// Load dashboard data
async function loadDashboard() {
  try {
    const data = await fetchAPI("/customers/dashboard");

    // Update overview
    document.getElementById("cardCode").textContent = data.card.code;
    document.getElementById("cardCodeText").textContent = data.card.code;
    document.getElementById("subStatus").textContent =
      data.subscription.status === "active" ? "Active" : "Inactive";
    if (data.subscription.currentPeriodEnd) {
      const date = new Date(
        data.subscription.currentPeriodEnd,
      ).toLocaleDateString();
      document.getElementById("nextBilling").textContent = date;
    }

    // Update profile
    const profileHTML = `
      <div>
        <p class="text-gray-500 text-sm">Name</p>
        <p class="font-semibold">${data.customer.firstName} ${data.customer.lastName}</p>
      </div>
      <div>
        <p class="text-gray-500 text-sm">Email</p>
        <p class="font-semibold">${data.customer.email}</p>
      </div>
      <div>
        <p class="text-gray-500 text-sm">Handle</p>
        <p class="font-semibold">@${data.customer.handle}</p>
      </div>
      <div>
        <p class="text-gray-500 text-sm">Member Since</p>
        <p class="font-semibold">${new Date().toLocaleDateString()}</p>
      </div>
    `;
    document.getElementById("profileInfo").innerHTML = profileHTML;

    // Populate card editor
    document.getElementById("photoUrl").value = data.card.photoUrl || "";
    document.getElementById("bio").value = data.card.bio || "";
    document.getElementById("contactEmail").value =
      data.card.contactEmail || "";

    // Load analytics
    loadAnalytics();
  } catch (error) {
    console.error("Error loading dashboard:", error);
    alert("Error loading dashboard: " + error.message);
  }
}

// Load analytics
async function loadAnalytics() {
  try {
    const data = await fetchAPI("/customers/analytics");

    document.getElementById("totalViews").textContent =
      data.analytics.totalViews;
    document.getElementById("analyticsViews").textContent =
      data.analytics.totalViews;
    document.getElementById("analyticsClicks").textContent =
      data.analytics.totalClicks;

    const clickRate =
      data.analytics.totalViews > 0
        ? Math.round(
            (data.analytics.totalClicks / data.analytics.totalViews) * 100,
          )
        : 0;
    document.getElementById("analyticsClickRate").textContent = clickRate + "%";

    // Chart
    const ctx = document.getElementById("viewsChart");
    if (ctx && data.analytics.viewsByDate.length > 0) {
      new Chart(ctx, {
        type: "line",
        data: {
          labels: data.analytics.viewsByDate.map((d) => d.date).reverse(),
          datasets: [
            {
              label: "Views",
              data: data.analytics.viewsByDate.map((d) => d.count).reverse(),
              borderColor: "#667eea",
              backgroundColor: "rgba(102, 126, 234, 0.1)",
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
          },
          scales: {
            y: { beginAtZero: true },
          },
        },
      });
    }
  } catch (error) {
    console.error("Error loading analytics:", error);
  }
}

// Card editor
document.getElementById("cardForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    const response = await fetchAPI("/customers/card", {
      method: "PUT",
      body: JSON.stringify({
        bio: document.getElementById("bio").value,
        contactEmail: document.getElementById("contactEmail").value,
        photoUrl: document.getElementById("photoUrl").value,
      }),
    });

    alert("Card updated successfully!");

    // Update preview
    updatePreview();
  } catch (error) {
    alert("Error updating card: " + error.message);
  }
});

// Update preview
function updatePreview() {
  const n = document.getElementById("bio").value || "Add your bio...";
  const photo = document.getElementById("photoUrl").value;
  const email = document.getElementById("contactEmail").value;

  document.getElementById("previewBio").textContent = n;
  document.getElementById("previewEmail").textContent =
    email || "contact@example.com";

  if (photo) {
    document.getElementById("previewPhoto").innerHTML =
      `<img src="${photo}" alt="Profile" class="w-full h-full rounded-full object-cover">`;
  }
}

// Bio character counter
document.getElementById("bio")?.addEventListener("input", (e) => {
  document.getElementById("bioCount").textContent = e.target.value.length;
  updatePreview();
});

// Logout
function logout() {
  if (confirm("Are you sure you want to log out?")) {
    localStorage.removeItem("token");
    window.location.href = "/index.html";
  }
}

// Initialize
loadDashboard();
