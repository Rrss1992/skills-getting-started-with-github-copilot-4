document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // store max on the card for later updates
        activityCard.dataset.max = details.max_participants;

        // Build participants HTML (bulleted list)
        const participantsHtml = (details.participants && details.participants.length)
          ? `<div class="participants">
               <h5>Participants</h5>
               <ul class="participants-list">
                 ${details.participants.map(p => `
                   <li class="participant-item">
                     <span class="participant-email">${p}</span>
                     <button class="participant-delete" data-activity="${encodeURIComponent(name)}" data-email="${encodeURIComponent(p)}" aria-label="Remove participant">✕</button>
                   </li>`).join("")}
               </ul>
             </div>`
          : `<p class="no-participants">No participants yet</p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p class="activity-desc">${details.description}</p>
          <p class="activity-schedule"><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="activity-availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHtml}
        `;

        activitiesList.appendChild(activityCard);

        // Attach delete handlers for participants in this card
        activityCard.querySelectorAll('.participant-delete').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const encodedActivity = btn.dataset.activity;
            const encodedEmail = btn.dataset.email;
            const activityName = decodeURIComponent(encodedActivity);
            const email = decodeURIComponent(encodedEmail);

            try {
              const res = await fetch(`/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
              const result = await res.json();
              if (res.ok) {
                // remove from DOM
                const li = btn.closest('.participant-item');
                if (li) li.remove();

                // update availability text
                const max = parseInt(activityCard.dataset.max || '0', 10);
                const currentCount = activityCard.querySelectorAll('.participant-item').length;
                const availabilityEl = activityCard.querySelector('.activity-availability');
                if (availabilityEl) {
                  const spotsLeftNew = max - currentCount;
                  availabilityEl.innerHTML = `<strong>Availability:</strong> ${spotsLeftNew} spots left`;
                }

                // show temporary message
                messageDiv.textContent = result.message || 'Removed participant';
                messageDiv.className = 'success';
                messageDiv.classList.remove('hidden');
                setTimeout(() => messageDiv.classList.add('hidden'), 3000);
              } else {
                messageDiv.textContent = result.detail || 'Failed to remove participant';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
                setTimeout(() => messageDiv.classList.add('hidden'), 3000);
              }
            } catch (err) {
              console.error('Error removing participant:', err);
              messageDiv.textContent = 'Failed to remove participant';
              messageDiv.className = 'error';
              messageDiv.classList.remove('hidden');
              setTimeout(() => messageDiv.classList.add('hidden'), 3000);
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
        // mark the card with activity name for later updates
        activityCard.dataset.activity = name;
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Update the specific activity card in the DOM without reload
        const cards = Array.from(document.querySelectorAll('.activity-card'));
        const card = cards.find(c => c.dataset.activity === activity || (c.querySelector('h4') && c.querySelector('h4').textContent === activity));
        if (card) {
          let ul = card.querySelector('.participants-list');
          // If participants section doesn't exist, create it
          if (!ul) {
            const participantsDiv = document.createElement('div');
            participantsDiv.className = 'participants';
            participantsDiv.innerHTML = `<h5>Participants</h5><ul class="participants-list"></ul>`;
            card.appendChild(participantsDiv);
            ul = participantsDiv.querySelector('.participants-list');
          }

          // Create new participant item
          const li = document.createElement('li');
          li.className = 'participant-item';
          const span = document.createElement('span');
          span.className = 'participant-email';
          span.textContent = email;
          const btn = document.createElement('button');
          btn.className = 'participant-delete';
          btn.setAttribute('data-activity', encodeURIComponent(activity));
          btn.setAttribute('data-email', encodeURIComponent(email));
          btn.setAttribute('aria-label', 'Remove participant');
          btn.textContent = '✕';
          li.appendChild(span);
          li.appendChild(btn);
          ul.appendChild(li);

          // attach delete handler to the new button
          btn.addEventListener('click', async () => {
            try {
              const res = await fetch(`/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
              const r = await res.json();
              if (res.ok) {
                li.remove();
                const max = parseInt(card.dataset.max || '0', 10);
                const currentCount = card.querySelectorAll('.participant-item').length;
                const availabilityEl = card.querySelector('.activity-availability');
                if (availabilityEl) {
                  const spotsLeftNew = max - currentCount;
                  availabilityEl.innerHTML = `<strong>Availability:</strong> ${spotsLeftNew} spots left`;
                }
                messageDiv.textContent = r.message || 'Removed participant';
                messageDiv.className = 'success';
                messageDiv.classList.remove('hidden');
                setTimeout(() => messageDiv.classList.add('hidden'), 3000);
              } else {
                messageDiv.textContent = r.detail || 'Failed to remove participant';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
                setTimeout(() => messageDiv.classList.add('hidden'), 3000);
              }
            } catch (err) {
              console.error('Error removing participant:', err);
            }
          });

          // update availability after adding
          const max = parseInt(card.dataset.max || '0', 10);
          const currentCount = card.querySelectorAll('.participant-item').length;
          const availabilityEl = card.querySelector('.activity-availability');
          if (availabilityEl) {
            const spotsLeftNew = max - currentCount;
            availabilityEl.innerHTML = `<strong>Availability:</strong> ${spotsLeftNew} spots left`;
          }
        }
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
