const records = [
  {
    type: 'INCIDENT REPORT', title: 'THE MIDNIGHT PURGE', integrity: '84%',
    text: '23시 47분, 칼리고 중앙 기억 저장소에서 원인 불명의 동기화 오류가 발생했다. 12분 뒤 시민 4만 7천 명의 기억 기록이 동시에 소거되었다. 감시 영상에 남은 것은 붉은 문을 통과하는 한 명의 실루엣뿐이다.'
  },
  {
    type: 'MEMORY FRAGMENT', title: 'RAIN ON LEVEL NINE', integrity: '61%',
    text: '레벨 나인의 비는 산성을 띤다. 파편 속 목소리는 같은 문장을 반복한다. “우리는 처음부터 여기 없었어.” 발신자의 생체 신호는 11년 전에 종료된 것으로 확인되었다.'
  },
  {
    type: 'INCIDENT REPORT', title: 'GHOST PROTOCOL', integrity: '92%',
    text: '기업 집행관 NR-09가 명령 체계에서 이탈했다. 추적팀 세 개 조가 교신 두절되었으며 대상의 신원과 전투 기록은 직후 시스템에서 말소되었다. 내부에서는 그를 WRAITH라 부르기 시작했다.'
  },
  {
    type: 'MEMORY FRAGMENT', title: 'THE RED DOOR', integrity: '37%',
    text: '좌표도 출입 기록도 존재하지 않는 붉은 문. 복구된 영상의 마지막 프레임에서 문 너머의 인물이 카메라를 바라본다. 안면 분석 결과는 현재 열람자의 생체 정보와 일치한다.'
  }
];

const root = document.documentElement;
const items = [...document.querySelectorAll('.archive-item')];
const filters = [...document.querySelectorAll('.archive-filters button')];
const title = document.querySelector('#recordTitle');
const type = document.querySelector('#recordType');
const text = document.querySelector('#recordText');
const integrity = document.querySelector('#recordIntegrity');
const recordView = document.querySelector('.record-view');

window.addEventListener('pointermove', (event) => {
  root.style.setProperty('--mx', `${event.clientX}px`);
  root.style.setProperty('--my', `${event.clientY}px`);
});

function selectRecord(index) {
  const record = records[index];
  items.forEach((item) => item.classList.toggle('active', Number(item.dataset.record) === index));
  recordView.animate([{ opacity: .45, transform: 'translateX(5px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'ease-out' });
  type.textContent = record.type;
  title.textContent = record.title;
  text.textContent = record.text;
  integrity.textContent = record.integrity;
}

items.forEach((item) => item.addEventListener('click', () => selectRecord(Number(item.dataset.record))));

filters.forEach((filter) => filter.addEventListener('click', () => {
  filters.forEach((button) => button.classList.toggle('active', button === filter));
  const category = filter.dataset.filter;
  items.forEach((item) => { item.hidden = category !== 'all' && item.dataset.category !== category; });
  const firstVisible = items.find((item) => !item.hidden);
  if (firstVisible) selectRecord(Number(firstVisible.dataset.record));
}));
