// For check-in modal
document.addEventListener('DOMContentLoaded', () => {
  navigator.geolocation.getCurrentPosition(pos => {
    document.getElementById('lat').value = pos.coords.latitude;
    document.getElementById('lng').value = pos.coords.longitude;
  });
});
// Camera
  const video = document.getElementById('videoPreview');
  const photoPreview = document.getElementById('photoPreview');
  const takePhotoBtn = document.getElementById('takePhoto');
  const selfieInput = document.getElementById('selfieInput');
  let stream;

  document.getElementById('captureSelfie').addEventListener('click', async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      video.srcObject = stream;
      video.classList.remove('d-none');
      takePhotoBtn.classList.remove('d-none');
      video.play();
    } catch (err) {
      console.error('Camera error:', err);
      alert('Could not access camera. Please allow permission and try again.');
    }
  });

  takePhotoBtn.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      const file = new File([blob], 'selfie.png', { type: 'image/png' });
      const dt = new DataTransfer();
      dt.items.add(file);
      selfieInput.files = dt.files;
      photoPreview.src = URL.createObjectURL(blob);
      photoPreview.classList.remove('d-none');
      video.classList.add('d-none');
      takePhotoBtn.classList.add('d-none');
      stream.getTracks().forEach(track => track.stop());
    });
  });

  // Signature
  const canvas = document.getElementById('signatureCanvas');
  const ctx = canvas.getContext('2d');
  let drawing = false;

  canvas.addEventListener('mousedown', (e) => {
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (drawing) {
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
    }
  });

  canvas.addEventListener('mouseup', () => drawing = false);

  canvas.addEventListener('mouseout', () => drawing = false);

  // Touch support
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    drawing = true;
    const touch = e.touches[0];
    ctx.beginPath();
    ctx.moveTo(touch.pageX - canvas.offsetLeft, touch.pageY - canvas.offsetTop);
  });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (drawing) {
      const touch = e.touches[0];
      ctx.lineTo(touch.pageX - canvas.offsetLeft, touch.pageY - canvas.offsetTop);
      ctx.stroke();
    }
  });

  canvas.addEventListener('touchend', () => drawing = false);

  window.clearCanvas = function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };