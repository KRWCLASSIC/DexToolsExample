export interface ToolActionContext {
  input: string;
  outputDir: string;
  outputFile: string;
  filesDir: string;
}

export interface ToolAction {
  name: string;
  description?: string;
  getArgs: (ctx: ToolActionContext) => string[];
}

export interface ToolItem {
  id: string;
  name: string;
  description: string;
  entrypoint: string;
  assetFile: string;
  actions: ToolAction[];
}

export const TOOLS: ToolItem[] = [
  {
    id: 'apksigner',
    name: 'apksigner',
    description: 'APK signature scheme verification (v1–v4)',
    entrypoint: 'com.android.apksigner.ApkSignerTool',
    assetFile: 'apksigner.dex.jar',
    actions: [
      {
        name: 'Verify (v1-v4)',
        description: 'Verifies APK signature schemes & cert details',
        getArgs: (ctx) => ['verify', '-v', '--print-certs', ctx.input]
      }
    ]
  },
  {
    id: 'ubersigner',
    name: 'UberSigner',
    description: 'Debug key signer & zipalign with resign support',
    entrypoint: 'at.favre.tools.apksigner.SignTool',
    assetFile: 'ubersigner.dex.jar',
    actions: [
      {
        name: 'Sign & Align',
        description: 'Signs with debug key & zipaligns (supports already signed APKs)',
        getArgs: (ctx) => ['--apks', ctx.input, '--out', ctx.outputDir, '--allowResign', '--overwrite']
      },
      {
        name: 'Verify Signatures',
        description: 'Quick signature scheme verification',
        getArgs: (ctx) => ['--verify', '--apks', ctx.input]
      }
    ]
  },
  {
    id: 'apkeditor',
    name: 'APKEditor',
    description: 'Manifest, resources, and split APK merger',
    entrypoint: 'com.reandroid.apkeditor.Main',
    assetFile: 'apkeditor.dex.jar',
    actions: [
      {
        name: 'Decode Resources',
        description: 'Decodes resources & AndroidManifest.xml',
        getArgs: (ctx) => ['d', '-i', ctx.input, '-o', `${ctx.outputDir}/apkeditor_decoded`, '-f']
      },
      {
        name: 'Build Decoded',
        description: 'Rebuilds decoded folder back to APK',
        getArgs: (ctx) => ['b', '-i', `${ctx.outputDir}/apkeditor_decoded`, '-o', ctx.outputFile, '-f']
      },
      {
        name: 'Merge Splits',
        description: 'Merges split bundle directory into single APK',
        getArgs: (ctx) => ['m', '-i', ctx.input, '-o', ctx.outputFile, '-f']
      }
    ]
  },
  {
    id: 'apktool',
    name: 'Apktool',
    description: 'Full Smali bytecode and resource disassembly',
    entrypoint: 'brut.apktool.Main',
    assetFile: 'apktool.dex.jar',
    actions: [
      {
        name: 'Decompile Smali',
        description: 'Full Smali bytecode & resource disassembly',
        getArgs: (ctx) => ['d', '-f', ctx.input, '-o', `${ctx.outputDir}/apktool_decompiled`, '-p', `${ctx.filesDir}/framework`]
      }
    ]
  }
];

export function buildDownloadUrl(repo: string, tag: string, assetFile: string): string {
  const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
  const cleanTag = tag.trim();
  return `https://github.com/${cleanRepo}/releases/download/${cleanTag}/${assetFile}`;
}
