// Handle sending an email
const form = document.getElementById("emailForm");
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const to = document.getElementById("to").value;
  const subject = document.getElementById("subject").value;
  const text = document.getElementById("text").value;

  try {
    const response = await fetch("/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, subject, text }),
    });

    const result = await response.text();
    document.getElementById("responseMessage").innerText = result;

    // Reload SentBox after sending email
    loadSentBox();
  } catch (error) {
    console.error("Error sending email:", error);
    document.getElementById("responseMessage").innerText = "Failed to send email.";
  }
});

// Load INBOX emails
async function loadInbox() {
  try {
    const response = await fetch("/get-received-emails");
    const emails = await response.json();
    
    // Log the fetched emails for debugging
    console.log("Fetched Emails:", emails);

    const inboxContainer = document.getElementById("inboxContainer");
    inboxContainer.innerHTML = "<h2>INBOX</h2>"; // Reset container with title

    // Ensure emails is an array before looping
    if (Array.isArray(emails) && emails.length > 0) {
      for (const email of emails) {
        const emailDiv = document.createElement("div");
        emailDiv.innerHTML = `
          <h3>From: ${email.from}</h3>
          <p>Subject: ${email.subject}</p>
          <p>Date: ${email.date}</p>
          <p>${email.body}</p>
          <hr />
        `;
        inboxContainer.appendChild(emailDiv);
      }
    } else {
      console.log("No emails found or the response is not an array.");
      inboxContainer.innerHTML += "<p>No emails found.</p>";
    }
  } catch (error) {
    console.error("Error fetching inbox emails:", error);
    document.getElementById("inboxContainer").innerHTML += "<p>Failed to load inbox emails.</p>";
  }
}

// Load SENTBOX emails
async function loadSentBox() {
  try {
    const response = await fetch("/get-sent-emails");
    const emails = await response.json();
    
    // Log the fetched sent emails for debugging
    console.log("Fetched Sent Emails:", emails);

    const sentContainer = document.getElementById("sentContainer");
    sentContainer.innerHTML = "<h2>SENTBOX</h2>"; // Reset container with title

    // Ensure emails is an array before looping
    if (Array.isArray(emails) && emails.length > 0) {
      for (const email of emails) {
        const emailDiv = document.createElement("div");
        emailDiv.innerHTML = `
          <h3>To: ${email.to}</h3>
          <p>Subject: ${email.subject}</p>
          <p>Date: ${email.date}</p>
          <p>${email.text}</p>
          <hr />
        `;
        sentContainer.appendChild(emailDiv);
      }
    } else {
      console.log("No sent emails found or the response is not an array.");
      sentContainer.innerHTML += "<p>No sent emails found.</p>";
    }
  } catch (error) {
    console.error("Error fetching sent emails:", error);
    document.getElementById("sentContainer").innerHTML += "<p>Failed to load sent emails.</p>";
  }
}

// Load both INBOX and SENTBOX when the page loads
window.onload = () => {
  loadInbox();
  loadSentBox();

  // Automatically fetch INBOX every 30 seconds (30000 milliseconds)
  setInterval(loadInbox, 30000); // Adjust time as needed
};
