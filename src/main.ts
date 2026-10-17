import { DexTools, runDexTool, AppPaths } from 'capacitor-dextools';
import { TOOLS, ToolItem, ToolAction, buildDownloadUrl, ToolActionContext } from './tools-config';

// DOM Elements
const repoInput = document.getElementById('repo-input') as HTMLInputElement;
const tagInput = document.getElementById('tag-input') as HTMLInputElement;
const inputPath = document.getElementById('input-path') as HTMLInputElement;
const outputPath = document.getElementById('output-path') as HTMLInputElement;
const btnUseSelf = document.getElementById('btn-use-self') as HTMLButtonElement;
const btnDownloadAll = document.getElementById('btn-download-all') as HTMLButtonElement;
const btnRunPipeline = document.getElementById('btn-run-pipeline') as HTMLButtonElement;
const toolsList = document.getElementById('tools-list') as HTMLDivElement;
const consoleBody = document.getElementById('console-body') as HTMLDivElement;
const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;
const btnAbort = document.getElementById('btn-abort') as HTMLButtonElement;

let appPaths: AppPaths | null = null;
const selectedActionState: Record<string, { value: string; label: string }> = {};

// Settings persistence
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
function log(msg: string, type: 'info' | 'error' | 'success' | 'warn' | 'neutral' = 'neutral') {
  const line = document.createElement('div');
  const classMap: Record<string, string> = {
    info: 'log-info',
    error: 'log-err',
    success: 'log-ok',
    warn: 'log-warn',
    neutral: 'log-neutral',
  };
  line.className = classMap[type] || 'log-neutral';
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
    log('[abort] process terminated', 'error');
  } catch (e: any) {
    log(`[abort error] ${e.message}`, 'error');
  }
});

btnUseSelf.addEventListener('click', () => {
  if (appPaths) {
    inputPath.value = appPaths.selfApk;
    outputPath.value = `${appPaths.cacheDir}/output.apk`;
    log(`[paths] reset to self APK: ${appPaths.selfApk}`, 'info');
  }
});

// IPC Listeners
DexTools.addListener('onLog', (event: { line: string }) => {
  const isErr = event.line.includes('[ERROR]') || event.line.includes('[FATAL]') || event.line.includes('Exception');
  log(event.line, isErr ? 'error' : 'neutral');
});

DexTools.addListener('onDownloadProgress', (event: { toolId: string; percentage: number }) => {
  const bar = document.getElementById(`pbar-${event.toolId}`) as HTMLDivElement;
  const fill = document.getElementById(`pfill-${event.toolId}`) as HTMLDivElement;
  if (bar && fill) {
    bar.style.display = 'block';
    fill.style.width = `${event.percentage}%`;
  }
});

// Global outside click handler to close custom dropdowns
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.custom-select-wrap')) {
    document.querySelectorAll('.select-menu.open').forEach((m) => m.classList.remove('open'));
  }
});

function getActionContext(): ToolActionContext {
  const defaultDir = appPaths ? appPaths.cacheDir : '/sdcard/Download';
  const defaultFile = appPaths ? `${appPaths.cacheDir}/output.apk` : '/sdcard/Download/output.apk';

  return {
    input: inputPath.value.trim() || (appPaths ? appPaths.selfApk : '/sdcard/Download/app.apk'),
    outputDir: defaultDir,
    outputFile: outputPath.value.trim() || defaultFile,
    filesDir: appPaths ? appPaths.filesDir : defaultDir,
  };
}

// Render Tools
async function refreshTools() {
  toolsList.innerHTML = '';

  for (const tool of TOOLS) {
    const { installed } = await DexTools.isToolInstalled({ toolId: tool.id });

    // Initialize state if not present
    if (!selectedActionState[tool.id]) {
      selectedActionState[tool.id] = { value: 'act-0', label: tool.actions[0].name };
    }
    const currentSelection = selectedActionState[tool.id];

    const row = document.createElement('div');
    row.className = 'tool-row';

    row.innerHTML = `
      <div class="tool-row-top">
        <span class="tool-name">${tool.name}</span>
        <span class="tool-status ${installed ? 'status-ok' : 'status-muted'}">
          ${installed ? 'installed' : 'not downloaded'}
        </span>
      </div>

      <div class="tool-row-bottom">
        ${
          installed
            ? `
          <div class="custom-select-wrap" id="wrap-${tool.id}">
            <button type="button" class="select-trigger" id="trigger-${tool.id}">
              <span class="select-val" id="val-${tool.id}">${currentSelection.label}</span>
              <span class="select-arrow">▾</span>
            </button>
            <div class="select-menu" id="menu-${tool.id}">
              ${tool.actions
                .map(
                  (act, i) => `
                <div class="select-opt ${currentSelection.value === `act-${i}` ? 'selected' : ''}" 
                     data-val="act-${i}" data-label="${act.name}">
                  ${act.name}
                </div>
              `
                )
                .join('')}
              <div class="select-divider"></div>
              <div class="select-action-btn" id="btn-update-${tool.id}">
                Update (Re-download)
              </div>
              <div class="select-action-btn danger" id="btn-del-${tool.id}">
                Delete Tool
              </div>
            </div>
          </div>
          <button class="btn btn-primary" id="btn-run-${tool.id}">Run</button>
        `
            : `
          <button class="btn btn-primary" style="width: 100%;" id="btn-dl-${tool.id}">Download</button>
        `
        }
      </div>

      <div class="tool-progress" id="pbar-${tool.id}">
        <div class="tool-progress-bar" id="pfill-${tool.id}"></div>
      </div>
    `;

    toolsList.appendChild(row);

    if (installed) {
      const trigger = document.getElementById(`trigger-${tool.id}`);
      const menu = document.getElementById(`menu-${tool.id}`);
      const valText = document.getElementById(`val-${tool.id}`);
      const btnRun = document.getElementById(`btn-run-${tool.id}`);
      const btnUpdate = document.getElementById(`btn-update-${tool.id}`);
      const btnDel = document.getElementById(`btn-del-${tool.id}`);

      // Toggle custom select menu
      trigger?.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasOpen = menu?.classList.contains('open');
        document.querySelectorAll('.select-menu.open').forEach((m) => m.classList.remove('open'));
        if (!wasOpen) {
          menu?.classList.add('open');
        }
      });

      // Handle custom option selection
      menu?.querySelectorAll('.select-opt').forEach((opt) => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const target = opt as HTMLElement;
          const val = target.dataset.val || 'act-0';
          const label = target.dataset.label || '';

          selectedActionState[tool.id] = { value: val, label };
          if (valText) valText.textContent = label;

          menu.querySelectorAll('.select-opt').forEach((o) => o.classList.remove('selected'));
          target.classList.add('selected');

          menu.classList.remove('open');
        });
      });

      // Immediate action: Update / Re-download
      btnUpdate?.addEventListener('click', (e) => {
        e.stopPropagation();
        menu?.classList.remove('open');
        download(tool);
      });

      // Immediate action: Delete Tool
      btnDel?.addEventListener('click', (e) => {
        e.stopPropagation();
        menu?.classList.remove('open');
        removeTool(tool);
      });

      // Run button executes currently selected tool action
      btnRun?.addEventListener('click', () => {
        const val = selectedActionState[tool.id]?.value || 'act-0';
        const actIdx = parseInt(val.replace('act-', ''), 10) || 0;
        runAction(tool, tool.actions[actIdx]);
      });
    } else {
      const btnDl = document.getElementById(`btn-dl-${tool.id}`);
      btnDl?.addEventListener('click', () => download(tool));
    }
  }
}

async function download(tool: ToolItem): Promise<boolean> {
  const repo = repoInput.value.trim() || 'KRWCLASSIC/DexToolsExample';
  const tag = tagInput.value.trim() || 'tools-v1';
  const url = buildDownloadUrl(repo, tag, tool.assetFile);

  log(`[download] fetching ${tool.assetFile}...`, 'info');

  const bar = document.getElementById(`pbar-${tool.id}`);
  if (bar) bar.style.display = 'block';

  try {
    await DexTools.downloadTool({
      toolId: tool.id,
      url,
      sha256: 'SKIP_VERIFICATION',
    });
    log(`[download] ${tool.name} ready`, 'success');
    return true;
  } catch (e: any) {
    log(`[download failed] ${e.message}`, 'error');
    return false;
  } finally {
    if (bar) bar.style.display = 'none';
    await refreshTools();
  }
}

async function downloadAll() {
  btnDownloadAll.disabled = true;
  const originalText = btnDownloadAll.textContent;

  try {
    log(`\n[download all] checking tools...`, 'info');
    let idx = 0;
    for (const tool of TOOLS) {
      idx++;
      btnDownloadAll.textContent = `Downloading ${idx}/${TOOLS.length}...`;
      const { installed } = await DexTools.isToolInstalled({ toolId: tool.id });
      if (!installed) {
        log(`[download all] downloading ${tool.name}...`, 'info');
        const ok = await download(tool);
        if (!ok) {
          log(`[download all] could not download ${tool.name}`, 'error');
        }
      } else {
        log(`[download all] ${tool.name} already ready`, 'neutral');
      }
    }
    log(`[download all] completed`, 'success');
  } catch (e: any) {
    log(`[download all error] ${e.message}`, 'error');
  } finally {
    btnDownloadAll.disabled = false;
    btnDownloadAll.textContent = originalText;
    await refreshTools();
  }
}

btnDownloadAll.addEventListener('click', downloadAll);

async function removeTool(tool: ToolItem) {
  try {
    await DexTools.deleteTool({ toolId: tool.id });
    log(`[deleted] ${tool.name}`, 'warn');
    await refreshTools();
  } catch (e: any) {
    log(`[delete failed] ${e.message}`, 'error');
  }
}

async function runAction(tool: ToolItem, act: ToolAction) {
  const ctx = getActionContext();
  const args = act.getArgs(ctx);

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
      log(`[exit ${res.exitCode}] ${tool.name} finished successfully`, 'success');
    } else {
      log(`[exit ${res.exitCode}] ${tool.name} returned code ${res.exitCode}`, 'error');
    }
  } catch (e: any) {
    log(`[error] ${e.message}`, 'error');
  }
}

// Pipeline Runner (Header "Run" button)
btnRunPipeline.addEventListener('click', async () => {
  const ctx = getActionContext();
  const apkPath = ctx.input;

  log(`\n======================================================`, 'info');
  log(`▶ PIPELINE: apksigner → APKEditor → UberSigner → apksigner`, 'info');
  log(`Target APK: ${apkPath}`, 'neutral');
  log(`Cache Dir:  ${ctx.outputDir}`, 'neutral');
  log(`======================================================`, 'info');

  btnRunPipeline.disabled = true;

  try {
    async function ensureTool(toolId: string) {
      const tool = TOOLS.find((t) => t.id === toolId)!;
      const { installed } = await DexTools.isToolInstalled({ toolId: tool.id });
      if (!installed) {
        log(`[pipeline] downloading ${tool.name}...`, 'info');
        const ok = await download(tool);
        if (!ok) throw new Error(`Could not download ${tool.name}`);
      }
      return tool;
    }

    // STEP 1: apksigner verify
    log(`\n[STEP 1/4] Inspecting APK with apksigner...`, 'info');
    const apksigner = await ensureTool('apksigner');
    const step1 = await runDexTool({
      toolId: apksigner.id,
      entrypoint: apksigner.entrypoint,
      args: ['verify', '-v', '--print-certs', apkPath],
    });
    if (!step1.success) {
      log(`[pipeline note] initial signature verify failed or unaligned, continuing...`, 'warn');
    }
    await new Promise((r) => setTimeout(r, 400));

    // STEP 2: APKEditor decode
    log(`\n[STEP 2/4] Decoding resources with APKEditor...`, 'info');
    const apkeditor = await ensureTool('apkeditor');
    const decodeDir = `${ctx.outputDir}/pipeline_decoded`;
    const step2 = await runDexTool({
      toolId: apkeditor.id,
      entrypoint: apkeditor.entrypoint,
      args: ['d', '-i', apkPath, '-o', decodeDir, '-f'],
    });
    log(`[STEP 2/4] APKEditor finished with exit code ${step2.exitCode}`, step2.success ? 'success' : 'warn');

    await new Promise((r) => setTimeout(r, 400));

    // STEP 3: UberSigner sign & align
    log(`\n[STEP 3/4] Re-signing & zipaligning with UberSigner...`, 'info');
    const ubersigner = await ensureTool('ubersigner');
    const signDir = `${ctx.outputDir}/pipeline_signed`;
    const step3 = await runDexTool({
      toolId: ubersigner.id,
      entrypoint: ubersigner.entrypoint,
      args: ['--apks', apkPath, '--out', signDir, '--allowResign', '--overwrite'],
    });
    if (!step3.success) {
      throw new Error(`UberSigner failed with code ${step3.exitCode}`);
    }

    await new Promise((r) => setTimeout(r, 400));

    // STEP 4: apksigner verify output
    log(`\n[STEP 4/4] Verifying newly signed APK with apksigner...`, 'info');
    const baseName = apkPath.split('/').pop()?.replace('.apk', '') || 'app';
    const signedApk = `${signDir}/${baseName}-aligned-debugSigned.apk`;

    log(`[pipeline] verifying: ${signedApk}`, 'neutral');
    const step4 = await runDexTool({
      toolId: apksigner.id,
      entrypoint: apksigner.entrypoint,
      args: ['verify', '-v', '--print-certs', signedApk],
    });

    log(`\n======================================================`, 'success');
    log(`✔ PIPELINE COMPLETED SUCCESSFULLY!`, 'success');
    log(`Output APK: ${signedApk}`, 'success');
    log(`======================================================`, 'success');
  } catch (err: any) {
    log(`\n[PIPELINE ABORTED] ${err.message}`, 'error');
  } finally {
    btnRunPipeline.disabled = false;
  }
});

// App Initialization
(async () => {
  try {
    appPaths = await DexTools.getAppPaths();
    if (appPaths) {
      inputPath.value = appPaths.selfApk;
      outputPath.value = `${appPaths.cacheDir}/output.apk`;
      log(`[init] detected self APK: ${appPaths.selfApk}`, 'info');
    }
  } catch (e: any) {
    log(`[init notice] could not resolve native paths: ${e.message}`, 'warn');
  }

  await refreshTools();
})();
