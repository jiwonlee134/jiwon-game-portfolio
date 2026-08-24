const root = document.documentElement;
const tabs = [...document.querySelectorAll('.dossier-tabs button')];
const panels = [...document.querySelectorAll('.tab-panel')];
const modal = document.querySelector('#protocolModal');
const engageButton = document.querySelector('#engageButton');
const closeButton = modal.querySelector('.protocol-close');

window.addEventListener('pointermove', (event) => {
  root.style.setProperty('--mx', `${event.clientX}px`);
  root.style.setProperty('--my', `${event.clientY}px`);
});

tabs.forEach((tab) => tab.addEventListener('click', () => {
  tabs.forEach((button) => {
    const selected = button === tab;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-selected', String(selected));
  });
  panels.forEach((panel) => {
    const selected = panel.id === tab.dataset.tab;
    panel.hidden = !selected;
    panel.classList.toggle('active', selected);
  });
}));

function openProtocol() {
  modal.hidden = false;
  document.body.classList.add('modal-open');
  closeButton.focus();
}
function closeProtocol() {
  modal.hidden = true;
  document.body.classList.remove('modal-open');
  engageButton.focus();
}

engageButton.addEventListener('click', openProtocol);
closeButton.addEventListener('click', closeProtocol);
modal.addEventListener('click', (event) => { if (event.target === modal) closeProtocol(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) closeProtocol(); });
