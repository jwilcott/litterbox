function updateDateTime() {
    const now = new Date();
    document.getElementById('date').textContent = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    document.getElementById('time').textContent = now.toLocaleTimeString('en-US', {
        hour12: false,
    });
}

setInterval(updateDateTime, 1000);
updateDateTime();
