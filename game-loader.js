/* A single game document loads one catalog entry and its unchanged puzzle data. */
(async()=>{
  const isEnglish=()=>{try{return (globalThis.StackStorage||localStorage).getItem('nonogram-playtest-v1-language')!=='ko';}catch{return true;}};
  let english=isEnglish();
  const $=id=>document.getElementById(id);
  function showLoading(){
    document.documentElement.lang=english?'en':'ko';
    $('game-loading').textContent=english?'Loading puzzle…':'퍼즐을 불러오는 중입니다.';
  }
  showLoading();
  async function readJSON(file){
    const response=await fetch(file);
    if(!response.ok)throw Error(`Could not load ${file}: ${response.status}`);
    return response.json();
  }
  function loadScript(file){return new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=file;script.onload=resolve;
    script.onerror=()=>reject(Error(`Could not load ${file}`));document.body.append(script);
  });}
  try{
    await (window.StackRuntime?.ready||Promise.resolve());
    english=isEnglish();showLoading();
    const catalog=await readJSON('pack-data/game-catalog.json?v=demo-12-v1');
    const weekly=await StackWeekly.load(catalog.puzzles.map(p=>p.id.replace(/^monochrome-/,'')));
    catalog.puzzles.push(...weekly.map(StackWeekly.puzzle));
    const id=new URLSearchParams(location.search).get('puzzle');
    const puzzle=catalog.puzzles.find(entry=>entry.id===id);
    if(!puzzle)throw Error('Unknown puzzle');
    const following=catalog.puzzles.filter(entry=>entry.number>puzzle.number).sort((a,b)=>a.number-b.number);
    globalThis.getNextStackPuzzle=()=>following.find(entry=>{
      try{
        const status=JSON.parse((globalThis.StackStorage||localStorage).getItem(entry.statusKey)||'null');
        return status?.complete!==true||status.filled!==entry.size*entry.size;
      }catch{return true;}
    })||null;
    const addition=weekly.find(p=>'monochrome-'+p.id===id);
    if(!addition&&!/^pack-data\/(?:mono-)?game-\d+\.json$/.test(puzzle.data))throw Error('Invalid puzzle data path');
    const [spec,layoutProfile]=await Promise.all([addition?StackWeekly.spec(addition):readJSON(puzzle.data),readJSON('pack-data/layout-profile-20.json')]),channels=1;
    if(!Number.isInteger(puzzle.size)||puzzle.size<1||spec.width!==puzzle.size||spec.height!==puzzle.size||
      spec.storageKey!==puzzle.storageKey||spec.maxStack!==3||spec.channels!==channels||
      !Array.isArray(spec.cells)||spec.cells.length!==puzzle.size*puzzle.size||
      !spec.cells.every(cell=>Array.isArray(cell)&&cell.length===channels&&cell.every(value=>Number.isInteger(value)&&value>=0&&value<=3)))throw Error('Invalid puzzle data');
    if(layoutProfile.size!==20||!['rows','columns'].every(axis=>Array.isArray(layoutProfile[axis])&&layoutProfile[axis].length&&layoutProfile[axis].every(groups=>Array.isArray(groups)&&groups.length<=layoutProfile.size&&groups.every(value=>Number.isInteger(value)&&value>=0&&value<=layoutProfile.size*9))))throw Error('Invalid layout profile');
    const n=puzzle.size,requestedMode=new URLSearchParams(location.search).get('mode');
    document.body.dataset.presentation=requestedMode==='color'||requestedMode==='monochrome'?requestedMode:StackPalette.readMode();
    StackPalette.writeMode(document.body.dataset.presentation);
    globalThis.StackPuzzle=puzzle;globalThis.StackLayoutProfile=layoutProfile;globalThis.GIVEN_DATA=[];
    globalThis.MONO_SPEC=spec;
    globalThis.PicrossCore=MonochromeCore.createCore(spec);
    document.body.classList.add('monochrome-game');
    document.title=`문제 ${puzzle.number} · 노노그램스택`;
    $('board').setAttribute('aria-label',`${n}행 ${n}열 피크로스`);
    $('board-viewport').setAttribute('aria-label',`화면에 맞춘 ${n}×${n} 입력판`);
    $('editor-panel').setAttribute('aria-label','스택 입력');
    $('win-art').setAttribute('aria-label','완성된 그림');
    const answer=spec.answer||spec.source?.subject;
    if(answer){$('win-description').textContent=answer;$('win-description').classList.add('win-answer');}
    else $('win-description').textContent=`${n*n*channels}개의 높이를 모두 찾았어요.`;
    for(const file of ['i18n.js','input-sounds.js','shared-ui.js','clue-feedback.js','hint-wallet.js','progress-preview.js','app.js?v=pc-portrait-1','board-layout.js','fruit-game-ui.js','hint-panel.js']){
      await loadScript(file);
      if(file==='hint-wallet.js')await window.StackRuntime?.recoverRewards();
    }
    $('game-loading').hidden=true;delete document.body.dataset.loading;
    try{
      (globalThis.StackStorage||localStorage).setItem('nonogram-playtest-v1-last-played-v1',JSON.stringify({puzzleId:puzzle.id}));
      await window.StackRuntime?.flush();
    }catch{/* A failed location save must not prevent playing the loaded puzzle. */}
    globalThis.stackGameReady=true;dispatchEvent(new Event('stack-game-ready'));
  }catch(error){
    globalThis.stackGameError=error.message;
    $('game-loading').hidden=true;
    const panel=$('game-load-error');panel.hidden=false;
    panel.querySelector('h1').textContent=english?'Unable to load puzzle':'문제를 불러올 수 없어요';
    panel.querySelector('p').textContent=english?'Please try again or return to the puzzle list.':'다시 시도하거나 문제 목록으로 돌아가 주세요.';
    $('retry-game').textContent=english?'Try again':'다시 시도';
    panel.querySelector('a').textContent=english?'Puzzle list':'문제 목록으로';
    $('retry-game').onclick=()=>location.reload();
  }
})();
