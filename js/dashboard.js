const metricElements = {
    date: document.getElementById('date'),
    time: document.getElementById('time'),
    cpuValue: document.getElementById('cpu-load'),
    cpuProgress: document.getElementById('cpu-load-progress'),
    memoryValue: document.getElementById('memory-usage'),
    memoryProgress: document.getElementById('memory-usage-progress'),
    gobsProgram: document.getElementById('gobs-program'),
    gobsInput: document.getElementById('gobs-input'),
    gobsCurrentInput: document.getElementById('gobs-current-input'),
    gobsOutput: document.getElementById('gobs-output'),
};

let activeRevision = null;

function updateDateTime() {
    const now = new Date();

    metricElements.date.textContent = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    metricElements.time.textContent = now.toLocaleTimeString('en-US', {
        hour12: false,
    });
}

function setProgress(element, percent) {
    element.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

function formatMegabytes(bytes) {
    return `${Math.round(bytes / (1024 * 1024))}MB`;
}

function updateCpuLoad() {
    let lastTick = performance.now();
    const sampleWindowMs = 1000;
    let driftTotalMs = 0;
    let driftSamples = 0;

    const sampler = setInterval(() => {
        const now = performance.now();
        const elapsed = now - lastTick;
        const drift = Math.max(0, elapsed - 100);

        driftTotalMs += drift;
        driftSamples += 1;
        lastTick = now;
    }, 100);

    const publishSample = () => {
        const averageDrift = driftSamples > 0 ? driftTotalMs / driftSamples : 0;
        const loadPercent = Math.round(Math.min(100, (averageDrift / 16) * 100));

        metricElements.cpuValue.textContent = `${loadPercent}%`;
        setProgress(metricElements.cpuProgress, loadPercent);

        driftTotalMs = 0;
        driftSamples = 0;
    };

    setTimeout(publishSample, sampleWindowMs);
    setInterval(publishSample, sampleWindowMs);

    window.addEventListener('beforeunload', () => clearInterval(sampler), { once: true });
}

async function getMemorySnapshot() {
    if (performance.memory) {
        return {
            usedBytes: performance.memory.usedJSHeapSize,
            limitBytes: performance.memory.jsHeapSizeLimit,
        };
    }

    if (typeof performance.measureUserAgentSpecificMemory === 'function') {
        try {
            const result = await performance.measureUserAgentSpecificMemory();
            return {
                usedBytes: result.bytes,
                limitBytes: null,
            };
        } catch (error) {
            return null;
        }
    }

    return null;
}

async function updateMemoryUsage() {
    const snapshot = await getMemorySnapshot();

    if (!snapshot) {
        const fallbackText = navigator.deviceMemory
            ? `~${navigator.deviceMemory}GB DEVICE`
            : 'UNAVAILABLE';

        metricElements.memoryValue.textContent = fallbackText;
        setProgress(metricElements.memoryProgress, 0);
        return;
    }

    const { usedBytes, limitBytes } = snapshot;
    const usedText = formatMegabytes(usedBytes);
    const percent = limitBytes ? (usedBytes / limitBytes) * 100 : 0;

    metricElements.memoryValue.textContent = limitBytes
        ? `${usedText} / ${formatMegabytes(limitBytes)}`
        : `${usedText} PAGE`;
    setProgress(metricElements.memoryProgress, percent);
}

function initializeGobsProgram() {
    const wordsPerRow = 5;
    const wordIntervalMs = 333;
    let printer = null;
    let printedWords = 0;
    let hasStarted = false;

    const focusInput = () => {
        metricElements.gobsInput.focus();
    };

    const printWord = () => {
        const separator = printedWords > 0 && printedWords % wordsPerRow === 0 ? '\n' : '  ';
        metricElements.gobsOutput.textContent += `${printedWords === 0 ? '' : separator}Penus`;
        metricElements.gobsOutput.scrollTop = metricElements.gobsOutput.scrollHeight;
        printedWords += 1;
    };

    const startPrinter = (answer) => {
        if (hasStarted) {
            return;
        }

        hasStarted = true;
        metricElements.gobsCurrentInput.textContent = answer;
        metricElements.gobsInput.disabled = true;
        printWord();
        printer = window.setInterval(printWord, wordIntervalMs);
    };

    metricElements.gobsProgram.addEventListener('click', focusInput);
    metricElements.gobsInput.addEventListener('blur', () => {
        if (!metricElements.gobsInput.disabled) {
            window.setTimeout(focusInput, 0);
        }
    });

    metricElements.gobsInput.addEventListener('input', (event) => {
        const value = event.target.value.toUpperCase().replace(/[^YN]/g, '').slice(0, 1);

        metricElements.gobsCurrentInput.textContent = value;
        event.target.value = value;

        if (value === 'Y' || value === 'N') {
            startPrinter(value);
        }
    });

    focusInput();

    window.addEventListener('beforeunload', () => {
        if (printer !== null) {
            clearInterval(printer);
        }
    }, { once: true });
}

async function checkForRemoteUpdates() {
    try {
        const response = await fetch(`version.json?ts=${Date.now()}`, {
            cache: 'no-store',
        });

        if (!response.ok) {
            return;
        }

        const payload = await response.json();

        if (!payload.commit) {
            return;
        }

        if (activeRevision === null) {
            activeRevision = payload.commit;
            return;
        }

        if (payload.commit !== activeRevision) {
            window.location.reload();
        }
    } catch (error) {
        // Ignore transient polling failures so the dashboard keeps running.
    }
}

updateDateTime();
updateMemoryUsage();
updateCpuLoad();
initializeGobsProgram();
checkForRemoteUpdates();

setInterval(updateDateTime, 1000);
setInterval(updateMemoryUsage, 5000);
setInterval(checkForRemoteUpdates, 30000);
