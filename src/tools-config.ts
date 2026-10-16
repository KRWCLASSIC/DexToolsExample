export interface ToolAction {
  name: string;
  getArgs: (input: string, output: string) => string[];
}

export interface ToolItem {
  id: string;
  name: string;
  entrypoint: string;
  assetFile: string;
  actions: ToolAction[];
}

export const TOOLS: ToolItem[] = [
  {
    id: 'apkeditor',
    name: 'APKEditor',
    entrypoint: 'com.reandroid.apkeditor.Main',
    assetFile: 'apkeditor.dex.jar',
    actions: [
      { name: 'Merge Splits', getArgs: (i, o) => ['m', '-i', i, '-o', o] },
      { name: 'Decode', getArgs: (i, o) => ['d', '-i', i, '-o', o] },
      { name: 'Build', getArgs: (i, o) => ['b', '-i', i, '-o', o] }
    ]
  },
  {
    id: 'ubersigner',
    name: 'UberSigner',
    entrypoint: 'com.github.patrickfav.uber.apk.signer.Main',
    assetFile: 'ubersigner.dex.jar',
    actions: [
      { name: 'Sign & Align', getArgs: (i) => ['--apks', i, '--overwrite'] },
      { name: 'Verify', getArgs: (i) => ['--verify', '--apks', i] }
    ]
  },
  {
    id: 'apksigner',
    name: 'apksigner',
    entrypoint: 'com.android.apksigner.ApkSignerTool',
    assetFile: 'apksigner.dex.jar',
    actions: [
      { name: 'Verify (v1-v4)', getArgs: (i) => ['verify', '-v', '--print-certs', i] }
    ]
  },
  {
    id: 'apktool',
    name: 'Apktool',
    entrypoint: 'brut.apktool.Main',
    assetFile: 'apktool.dex.jar',
    actions: [
      {
        name: 'Decompile',
        getArgs: (i, o) => ['d', '-f', i, '-o', o, '-p', '/data/user/0/com.appium.dextoolsexample/files/framework']
      }
    ]
  }
];

export function buildDownloadUrl(repo: string, tag: string, assetFile: string): string {
  const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
  const cleanTag = tag.trim();
  return `https://github.com/${cleanRepo}/releases/download/${cleanTag}/${assetFile}`;
}
