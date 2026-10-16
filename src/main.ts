import { DexTools, runDexTool } from 'capacitor-dextools';
import { TOOLS, ToolItem, buildDownloadUrl } from './tools-config';

// Elements
const repoInput = document.getElementById('repo-input') as HTMLInputElement;
const tagInput = document.getElementById('tag-input') as HTMLInputElement;
const inputPath = document.getElementById('input-path') as HTMLInputElement;
const outputPath = document.getElementById('output-path') as HTMLInputElement;
const toolsList = document.getElementById('tools-list') as HTMLDivElement;
const consoleBody = document.getElementById('console-body') as HTMLDivElement;
const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;
const btnAbort = document.getElementById('btn-abort') as HTMLButtonElement;

// Restore saved repository settings
const savedRepo = localStorage.getItem('dextools_repo');
const savedTag = localStorage.getItem('dextools_tag');
if (savedRepo) repoInput.value = savedRepo;
if (savedTag) tagInput.value = savedTag;

repoInput.addEventListener('change', () => {
  localStorage.setItem('dextools_repo', repoInput.value.trim());
});
tagInput.addEventListener('change', () => {
  localStorage.setItem('dextools_tag', tagInput.value.trim());
});

// Logging
function log(msg: string, type: 'info' | 'error' | 'success' | 'warn' | 'default' = 'default') {
  const line = document.createElement('div');
  line.className = type !== 'default' ? `line-${type}` : '';
  line.textContent = msg;
  consoleBody.appendChild(line);
  consoleBody.scrollTop = consoleBody.scrollHeight;
}

btnClear.addEventListener('click', () => {
  consoleBody.innerHTML = '';
});

btnAbort.addEventListener('click', async () => {
  log('[abort] killing worker process...', 'warn');
  try {
    await DexTools.abort();
    log('[abort] worker killed', 'error');
  } catch (e: any) {
    log(`[abort error] ${e.message}`, 'error');
  }
});

// Listeners
DexTools.addListener('onLog', (event: { line: string }) => {
  const isErr = event.line.includes('[ERROR]') || event.line.includes('[FATAL]');
  log(event.line, isErr ? 'error' : 'default');
});

DexTools.addListener('onDownloadProgress', (event: { toolId: string; percentage: number }) => {
  const bar = document.getElementById(`pbar-${event.toolId}`) as HTMLDivElement;
  const fill = document.getElementById(`pfill-${event.toolId}`) as HTMLDivElement;
  if (bar && fill) {
    bar.style.display = 'block';
    fill.style.width = `${event.percentage}%`;
  }
});

// Render Tools
async function refreshTools() {
  toolsList.innerHTML = '';

  for (const tool of TOOLS) {
    const { installed } = await DexTools.isToolInstalled({ toolId: tool.id });

    const row = document.createElement('div');
    row.className = 'tool-row';

    row.innerHTML = `
      <div class="tool-top">
        <span class="tool-title">${tool.name}</span>
        <span class="tool-state ${installed ? 'state-ok' : 'state-no'}">
          ${installed ? 'installed' : 'not downloaded'}
        </span>
      </div>

      <div class="progress" id="pbar-${tool.id}">
        <div class="progress-bar" id="pfill-${tool.id}"></div>
      </div>

      <div class="tool-controls">
        ${tool.actions.map((act, i) => `
          <button class="btn btn-blue btn-sm" id="btn-act-${tool.id}-${i}">${act.name}</button>
        `).join('')}
        <button class="btn btn-sm" id="btn-dl-${tool.id}">
          ${installed ? 'Update' : 'Download'}
        </button>
        ${installed ? `<button class="btn btn-danger btn-sm" id="btn-del-${tool.id}">Delete</button>` : ''}
      </div>
    `;

    toolsList.appendChild(row);

    // Download click
    const btnDl = document.getElementById(`btn-dl-${tool.id}`);
    btnDl?.addEventListener('click', () => download(tool));

    // Delete click
    const btnDel = document.getElementById(`btn-del-${tool.id}`);
    btnDel?.addEventListener('click', () => removeTool(tool));

    // Action clicks
    tool.actions.forEach((act, i) => {
      const btn = document.getElementById(`btn-act-${tool.id}-${i}`);
      btn?.addEventListener('click', () => runAction(tool, act));
    });
  }
}

async function download(tool: ToolItem) {
  const repo = repoInput.value.trim() || 'KRWCLASSIC/DexToolsExample';
  const tag = tagInput.value.trim() || 'tools-v1';
  const url = buildDownloadUrl(repo, tag, tool.assetFile);

  log(`[download] fetching ${tool.assetFile} from ${url}...`, 'info');

  try {
    await DexTools.downloadTool({
      toolId: tool.id,
      url,
      sha256: 'SKIP_VERIFICATION',
    });
    log(`[download] ${tool.name} installed & locked (read-only)`, 'success');
  } catch (e: any) {
    log(`[download failed] ${e.message}`, 'error');
  } finally {
    const bar = document.getElementById(`pbar-${tool.id}`);
    if (bar) bar.style.display = 'none';
    await refreshTools();
  }
}

async function removeTool(tool: ToolItem) {
  try {
    await DexTools.deleteTool({ toolId: tool.id });
    log(`[deleted] ${tool.name}`, 'warn');
    await refreshTools();
  } catch (e: any) {
    log(`[delete failed] ${e.message}`, 'error');
  }
}

async function runAction(tool: ToolItem, act: ToolItem['actions'][0]) {
  const i = inputPath.value.trim();
  const o = outputPath.value.trim();
  const args = act.getArgs(i, o);

  const repo = repoInput.value.trim() || 'KRWCLASSIC/DexToolsExample';
  const tag = tagInput.value.trim() || 'tools-v1';
  const url = buildDownloadUrl(repo, tag, tool.assetFile);

  log(`\n> ${tool.name} ${args.join(' ')}`, 'info');

  try {
    const res = await runDexTool({
      toolId: tool.id,
      entrypoint: tool.entrypoint,
      downloadUrl: url,
      sha256: 'SKIP_VERIFICATION',
      args,
    });

    if (res.success) {
      log(`[exit ${res.exitCode}] success`, 'success');
    } else {
      log(`[exit ${res.exitCode}] failed`, 'error');
    }
  } catch (e: any) {
    log(`[error] ${e.message}`, 'error');
  }
}

// Initial render
refreshTools();
