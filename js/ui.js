export function initUI() {
  updateHearts();
  detectInputDevices();

  document.getElementById('jumpBtn').addEventListener('click', () => {
    if (window.controls && window.controls.getObject().position.y <= 2) {
      window.controls.getObject().position.y += 5;
    }
  });
}

export function updateHearts() {
  const heartText = '❤️'.repeat(window.hearts);
  document.getElementById('hearts').textContent = heartText;
}

function detectInputDevices() {
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const hasKeyboard = navigator.keyboard || window.matchMedia('(pointer:fine)').matches;
  if (hasTouch && !hasKeyboard) {
    document.getElementById('mobileControls').style.display = 'flex';
    document.getElementById('jumpBtn').style.display = 'block';
  } else {
    document.getElementById('mobileControls').style.display = 'none';
    document.getElementById('jumpBtn').style.display = 'none';
  }
}