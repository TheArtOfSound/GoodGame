import { Document } from '../components';
import { TEMPLATES } from '../play';
import type { Env } from '../lib';

const ACCENTS = ['#6b93ff', '#34d399', '#2dd4bf', '#b06bff', '#ec4899', '#f0b323', '#f97316', '#f43f5e', '#8b5cf6', '#38bdf8'];

export function CreatePage(props: { env: Env; error?: string; values?: Record<string, string> }) {
  const { env } = props;
  const v = props.values || {};
  return (
    <Document env={env} active="create"
      meta={{ title: 'Create a game — GoodGame.center', description: 'Publish a playable game on GoodGame in minutes. Start from a built-in template and get a live, indexable game page.', path: '/create', noindex: true }}>
      <div class="container">
        <div class="phead">
          <h1>Create a game</h1>
          <p>Pick a playable template, name your game, and publish. You'll get a live, indexable game page with a working Play button — instantly.</p>
        </div>

        {props.error ? <div class="notice" style="border-color:var(--danger);color:var(--danger);margin-bottom:18px">{props.error}</div> : null}

        <form method="post" action="/create" class="form-grid" enctype="multipart/form-data">
          <div class="field">
            <label>Game title</label>
            <input type="text" name="title" maxLength="60" required placeholder="e.g. Hyperline" value={v.title || ''} />
          </div>

          <div class="field">
            <label>Short pitch <span class="dim" style="font-weight:400">— one line</span></label>
            <input type="text" name="pitch" maxLength="120" required placeholder="A neon arena where every match ends in a clip." value={v.pitch || ''} />
          </div>

          <div class="field">
            <label>Description</label>
            <textarea name="description" maxLength="1200" placeholder="What is your game? How does it play? Separate paragraphs with a blank line.">{v.description || ''}</textarea>
            <div class="hint">Plain text. Blank lines become paragraphs on your game page.</div>
          </div>

          <div class="field">
            <label>Tags <span class="dim" style="font-weight:400">— comma separated</span></label>
            <input type="text" name="tags" maxLength="80" placeholder="arena, fast, neon" value={v.tags || ''} />
          </div>

          <div class="field">
            <label>Cover accent</label>
            <div class="swatches">
              {ACCENTS.map((hex, i) => (
                <>
                  <input type="radio" id={`ac${i}`} name="accent" value={hex} checked={v.accent ? v.accent === hex : i === 0} />
                  <label for={`ac${i}`} style={`background:${hex};color:${hex}`} />
                </>
              ))}
            </div>
            <div class="hint">Your whole game page and its generative cover art are themed from this color.</div>
          </div>

          <div class="field">
            <label>Upload your game build <span class="dim" style="font-weight:400">— .zip of a web export</span></label>
            <input type="file" name="build" accept=".zip,application/zip,application/x-zip-compressed" />
            <div class="hint">Zip the build folder from <b>HTML5, WebGL, Unity WebGL, Godot web, Phaser</b> — anything that exports to the web. It must contain an <code>index.html</code>. We unzip it, host the files, and make it playable on your page. Up to 90 MB. Leave empty to use a template instead.</div>
          </div>

          <div class="divider-or">or pick a built-in template</div>

          <div class="field">
            <label>Playable template <span class="dim" style="font-weight:400">— used only if you don't upload a build</span></label>
            <div class="tmpls">
              {TEMPLATES.map((t, i) => (
                <>
                  <input type="radio" id={`tm${t.id}`} name="template" value={t.id} checked={v.template ? v.template === t.id : i === 0} />
                  <label for={`tm${t.id}`}><div class="nm">{t.name}</div><div class="bl">{t.blurb}</div></label>
                </>
              ))}
              <input type="radio" id="tmnone" name="template" value="" checked={v.template === ''} />
              <label for="tmnone"><div class="nm">No template</div><div class="bl">Page only — wire a build later via the console.</div></label>
            </div>
          </div>

          <div class="row" style="gap:12px;margin-top:6px">
            <button type="submit" class="btn btn-accent" style="padding:13px 26px">Publish game</button>
            <a href="/games" class="btn btn-ghost">Cancel</a>
          </div>
          <p class="dim" style="font-size:12.5px;max-width:60ch">Published to the community catalog as a community game. Real accounts, drafts, media uploads, and native builds come with the creator-console workstream — for now this proves the full create → publish → play loop end to end.</p>
        </form>
      </div>
    </Document>
  );
}
