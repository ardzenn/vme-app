document.addEventListener('DOMContentLoaded', () => {
    // Sales Manager specific functionality
    window.exportSalesReport = async function() {
      window.open('/api/sales/export-report?format=excel', '_blank');
    }

    window.sendMotivationalMessage = async function() {
        const message = prompt('Enter motivational message for the team:');
        if (message) {
            try {
                const response = await fetch('/api/sales/send-team-message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, recipients: 'all_msr' })
                });
                const data = await response.json();
                if (data.success) {
                    alert('Message sent to all MSRs!');
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (err) {
                alert('Error sending message');
            }
        }
    }

    window.setMonthlyTargets = async function() {
        const target = prompt('Set monthly sales target (₱):');
        if (target && !isNaN(target)) {
            try {
                const response = await fetch('/api/sales/set-target', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        target: parseInt(target),
                        month: new Date().getMonth() + 1,
                        year: new Date().getFullYear()
                    })
                });
                const data = await response.json();
                alert(data.message || `Monthly target set to ₱${parseInt(target).toLocaleString()}`);
            } catch (err) {
                alert('Error setting target');
            }
        }
    }

    window.scheduleTeamMeeting = async function() {
        const date = prompt('Enter meeting date (YYYY-MM-DD):');
        const time = prompt('Enter meeting time (HH:MM):');
        if (date && time) {
            try {
                const response = await fetch('/api/sales/schedule-meeting', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ date, time, type: 'team_meeting' })
                });
                const data = await response.json();
                alert(data.message || `Team meeting scheduled for ${date} at ${time}`);
            } catch (err) {
                alert('Error scheduling meeting');
            }
        }
    }
});
