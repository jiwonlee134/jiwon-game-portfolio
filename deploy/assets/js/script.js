const root = document.documentElement;
const glow = document.querySelector('.cursor-glow');
const title = document.querySelector('.glitch');
const cityTime = document.querySelector('#cityTime');
const soundButton = document.querySelector('.sound-toggle');
const soundLabel = document.querySelector('.sound-label');
const modal = document.querySelector('#trailerModal');
const trailerButton = document.querySelector('#trailerButton');
const accessButton = document.querySelector('#accessButton');
const closeButton = modal.querySelector('.modal-close');

window.addEventListener('pointermove', (event) => {
  const x = event.clientX / window.innerWidth;
  const y = event.clientY / window.innerHeight;
  root.style.setProperty('--mx', `${event.clientX}px`);
  root.style.setProperty('--my', `${event.clientY}px`);
  root.style.setProperty('--px', x);
  root.style.setProperty('--py', y);
});

const glitch = () => {
  title.classList.add('active');
  window.setTimeout(() => title.classList.remove('active'), 130);
};
window.setInterval(glitch, 3300);

const updateClock = () => {
  const now = new Date();
  cityTime.textContent = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((part) => String(part).padStart(2, '0')).join(':');
};
updateClock();
window.setInterval(updateClock, 1000);

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.16 });
document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

let audioContext;
soundButton.addEventListener('click', () => {
  const enabled = soundButton.getAttribute('aria-pressed') !== 'true';
  soundButton.setAttribute('aria-pressed', String(enabled));
  soundButton.classList.toggle('active', enabled);
  soundLabel.textContent = enabled ? 'Sound on' : 'Sound off';

  if (enabled) {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(74, audioContext.currentTime);
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.07, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.7);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.72);
  }
});

const openModal = () => {
  modal.hidden = false;
  document.body.classList.add('modal-open');
  closeButton.focus();
};
const closeModal = () => {
  modal.hidden = true;
  document.body.classList.remove('modal-open');
  trailerButton.focus();
};
trailerButton.addEventListener('click', openModal);
closeButton.addEventListener('click', closeModal);
modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) closeModal(); });

accessButton.addEventListener('click', () => {
  const original = accessButton.innerHTML;
  accessButton.innerHTML = 'Access requested <span>✓</span>';
  accessButton.disabled = true;
  window.setTimeout(() => {
    accessButton.innerHTML = original;
    accessButton.disabled = false;
  }, 2800);
});
