// My FYI Signup Form - Vanilla JS with Stripe
const stripe = Stripe(window.STRIPE_PUBLISHABLE_KEY || "pk_test_");
const elements = stripe.elements();
const cardElement = elements.create("card", {
  style: {
    base: {
      fontSize: "16px",
      color: "#424770",
    },
    invalid: {
      color: "#9e2146",
    },
  },
});
cardElement.mount("#card-element");

// Handle card errors
cardElement.on("change", function (event) {
  const displayError = document.getElementById("card-errors");
  if (event.error) {
    displayError.textContent = event.error.message;
  } else {
    displayError.textContent = "";
  }
});

// Handle form submission
document
  .getElementById("signupForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const submitBtn = document.getElementById("submitBtn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Processing...";

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const handle = document.getElementById("handle").value;
    const promoCode = document.getElementById("promoCode").value;

    try {
      // Step 1: Create account via API
      const signupResponse = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          handle,
          promoCode: promoCode || undefined,
        }),
      });

      if (!signupResponse.ok) {
        const error = await signupResponse.json();
        throw new Error(
          error.error || error.errors?.[0]?.msg || "Signup failed",
        );
      }

      const signupData = await signupResponse.json();
      const token = signupData.token;
      const clientSecret = signupData.clientSecret;

      // Store token for later
      localStorage.setItem("token", token);

      // Step 2: Confirm payment with Stripe
      const { paymentIntent, error } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              email,
              name: `${firstName} ${lastName}`,
            },
          },
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      if (paymentIntent.status === "succeeded") {
        // Success! Redirect to dashboard
        alert("Welcome to My FYI! Redirecting to your dashboard...");
        window.location.href = "/dashboard.html";
      } else if (paymentIntent.status === "requires_action") {
        alert(
          "Payment requires additional authentication. Please complete it.",
        );
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
      console.error("Signup error:", error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Complete Sign Up ($7.95/month)";
    }
  });
