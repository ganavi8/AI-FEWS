(() => {
  const coordinateForm = document.getElementById('coordinate-form');
  const latitudeInput = document.getElementById('manual-lat');
  const longitudeInput = document.getElementById('manual-lon');
  const latitudeError = document.getElementById('lat-error');
  const longitudeError = document.getElementById('lon-error');
  const feedback = document.getElementById('location-feedback');
  const triggers = [...document.querySelectorAll('.location-trigger')];
  const recordTitle = document.getElementById('record-title');
  const recordCoordinates = document.getElementById('record-coordinates');
  const recordMethod = document.getElementById('record-method');
  const recordTime = document.getElementById('record-time');
  const availabilityNote = document.getElementById('availability-note');
  const availabilityText = document.getElementById('availability-text');

  const formatCoordinate = (value) => Number(value).toFixed(6);
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  function announce(message, tone = '') {
    feedback.textContent = message;
    feedback.dataset.tone = tone;
  }

  function clearFieldError(input, messageElement) {
    input.removeAttribute('aria-invalid');
    messageElement.textContent = '';
  }

  function setFieldError(input, messageElement, message) {
    input.setAttribute('aria-invalid', 'true');
    messageElement.textContent = message;
  }

  function markLocation(coordinates, method) {
    const latitude = Number(coordinates.latitude);
    const longitude = Number(coordinates.longitude);
    const latText = formatCoordinate(latitude);
    const lonText = formatCoordinate(longitude);
    const timestamp = new Date();

    latitudeInput.value = latText;
    longitudeInput.value = lonText;
    clearFieldError(latitudeInput, latitudeError);
    clearFieldError(longitudeInput, longitudeError);
    recordTitle.textContent = 'Coordinates resolved';
    recordCoordinates.textContent = `${latText}°, ${lonText}°`;
    recordMethod.textContent = method;
    recordTime.textContent = timeFormatter.format(timestamp);
    availabilityNote.dataset.state = 'located';
    availabilityText.innerHTML = '<strong>UNAVAILABLE</strong> · Coordinates are available; no live environmental observation is connected.';
    announce(`Coordinates loaded by ${method.toLowerCase()}. Environmental classification remains unavailable.`, 'success');
  }

  function validateCoordinate(input, errorElement, label, min, max) {
    const raw = input.value.trim();
    if (!raw) {
      setFieldError(input, errorElement, `${label} is required.`);
      return null;
    }
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw)) {
      setFieldError(input, errorElement, 'Enter a valid number.');
      return null;
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      setFieldError(input, errorElement, 'Enter a valid number.');
      return null;
    }
    if (value < min || value > max) {
      setFieldError(input, errorElement, `Enter a value from ${min} to ${max}.`);
      return null;
    }
    clearFieldError(input, errorElement);
    return value;
  }

  coordinateForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const latitude = validateCoordinate(latitudeInput, latitudeError, 'Latitude', -90, 90);
    const longitude = validateCoordinate(longitudeInput, longitudeError, 'Longitude', -180, 180);

    if (latitude === null || longitude === null) {
      announce('Check the highlighted coordinates and try again.', 'error');
      (latitude === null ? latitudeInput : longitudeInput).focus();
      return;
    }

    availabilityNote.dataset.state = 'located';
    markLocation({ latitude, longitude }, 'Manual coordinates');
  });

  [[latitudeInput, latitudeError], [longitudeInput, longitudeError]].forEach(([input, error]) => {
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') clearFieldError(input, error);
    });
  });

  function setBusy(busy) {
    triggers.forEach((button) => {
      button.disabled = busy;
      button.setAttribute('aria-busy', String(busy));
    });
    const primaryLabel = triggers[1]?.querySelector('span');
    if (primaryLabel) primaryLabel.textContent = busy ? 'Requesting location…' : 'Request current location';
    if (triggers[0]) {
      const topLabel = triggers[0].querySelector('span');
      if (topLabel) topLabel.textContent = busy ? 'Locating…' : 'Use my location';
    }
  }

  function locationFailure(error) {
    setBusy(false);
    let message = 'Unable to read your location. You can enter coordinates manually.';
    if (error && error.code === 1) {
      message = 'Location permission was denied. You can enter coordinates manually instead.';
    } else if (error && error.code === 2) {
      message = 'Your current location is unavailable. Check device location settings or enter coordinates manually.';
    } else if (error && error.code === 3) {
      message = 'The location request timed out. Try again or enter coordinates manually.';
    }
    announce(message, 'error');
  }

  function requestLocation() {
    if (!('geolocation' in navigator) || !navigator.geolocation) {
      announce('This browser does not support location. You can enter coordinates manually.', 'error');
      return;
    }
    if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      announce('Browser location requires a secure connection. You can enter coordinates manually.', 'error');
      return;
    }
    setBusy(true);
    announce('Waiting for a one-time browser location. You can still enter coordinates manually.', 'pending');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBusy(false);
        markLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }, 'Browser location');
      },
      locationFailure,
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 0 },
    );
  }

  document.querySelectorAll('.nav-link[aria-disabled="true"]').forEach((link) => {
    link.addEventListener('click', (event) => event.preventDefault());
  });

  triggers.forEach((button) => button.addEventListener('click', requestLocation));

  const logo = document.querySelector('.brand-mark');
  if (logo) logo.addEventListener('error', () => logo.closest('.brand-mark-wrap')?.classList.add('is-fallback'), { once: true });
})();
