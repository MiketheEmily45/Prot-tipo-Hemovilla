// Testes do ajuste automatico de texto (fitTextToBox), CharacterDescriptionPanel e GuidePanel:
//   node tests/text-fit.mjs
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

const storage = new Map();
globalThis.window = {
    location: { search: '' },
    localStorage: {
        getItem: (key) => (storage.has(key) ? storage.get(key) : null),
        setItem: (key, value) => { storage.set(key, String(value)); },
        removeItem: (key) => { storage.delete(key); }
    }
};
globalThis.Phaser = {
    Math: { Clamp: (v, min, max) => Math.max(min, Math.min(max, v)) },
    Textures: { FilterMode: { NEAREST: 1 } }
};

const { fitTextToBox } = await import('../src/scenes/textUtils.js');
const { CharacterDescriptionPanel, DESCRIPTION_PANEL_CONFIG } = await import('../src/scenes/CharacterDescriptionPanel.js');
const { characterData } = await import('../src/scenes/characterData.js');
const { SHOP_CHARACTER_PRESENTATIONS } = await import('../src/scenes/shopCharacterPresentation.js');
const { GuidePanel } = await import('../src/scenes/GuidePanel.js');

function measureWrapped(text, fontSize, wrapWidth, lineSpacing = 0) {
    const charW = fontSize * 0.62;
    const lineH = Math.ceil(fontSize * 1.25);
    const maxChars = Math.max(1, Math.floor((wrapWidth || 9999) / charW));
    const lines = [];
    for (const para of String(text || '').split('\n')) {
        if (!para) {
            lines.push('');
            continue;
        }
        let line = '';
        for (const word of para.split(/\s+/)) {
            const candidate = line ? `${line} ${word}` : word;
            if (candidate.length <= maxChars || !line) {
                line = candidate;
            } else {
                lines.push(line);
                line = word;
            }
        }
        if (line) lines.push(line);
    }
    const maxLineLen = Math.max(0, ...lines.map((l) => l.length));
    const width = Math.ceil(maxLineLen * charW);
    const height = lines.length * lineH + Math.max(0, lines.length - 1) * lineSpacing;
    return { width, height };
}

function makeTextObject(x, y, content, style = {}) {
    let fontSize = parseInt(style.fontSize || '14', 10) || 14;
    let wrapWidth = style.wordWrap?.width || 0;
    const lineSpacing = style.lineSpacing || 0;

    const obj = Object.assign(new EventEmitter(), {
        kind: 'text',
        x,
        y,
        text: content,
        style,
        originX: 0,
        originY: 0,
        depth: 0,
        width: 0,
        height: 0,
        recalc() {
            const m = measureWrapped(this.text, fontSize, wrapWidth, lineSpacing);
            this.width = m.width;
            this.height = m.height;
        },
        setFontSize(sizeStr) {
            fontSize = parseInt(sizeStr, 10) || fontSize;
            this.fontSize = fontSize;
            this.recalc();
            return this;
        },
        setWordWrapWidth(w) {
            wrapWidth = w;
            this.wrapWidth = w;
            this.recalc();
            return this;
        },
        setStyle(s) {
            if (s?.wordWrap?.width) wrapWidth = s.wordWrap.width;
            this.recalc();
            return this;
        },
        setOrigin(ox = 0.5, oy = ox) { this.originX = ox; this.originY = oy; return this; },
        setDepth(d) { this.depth = d; return this; },
        setPosition(nx, ny) { this.x = nx; this.y = ny; return this; },
        setMask() { return this; },
        setColor() { return this; },
        setInteractive() { return this; },
        setText(t) { this.text = t; this.recalc(); return this; },
        destroy() { this.destroyed = true; }
    });
    obj.fontSize = fontSize;
    obj.wrapWidth = wrapWidth;
    obj.recalc();
    return obj;
}

function makeGenericObject(kind, extra = {}) {
    return Object.assign(new EventEmitter(), {
        kind,
        texture: { setFilter() {} },
        setOrigin() { return this; },
        setDepth() { return this; },
        setScale() { return this; },
        setDisplaySize() { return this; },
        setStrokeStyle() { return this; },
        setFillStyle() { return this; },
        setInteractive() { return this; },
        setVisible() { return this; },
        fillStyle() { return this; },
        fillRect() { return this; },
        createGeometryMask() { return this; },
        destroy() { this.destroyed = true; }
    }, extra);
}

function createScene(cityIndex = 0) {
    const texts = [];
    const scene = {
        cityIndex,
        currentCityIndex: cityIndex,
        texts,
        textures: { exists: () => true },
        add: {
            rectangle: (x, y, w, h) => makeGenericObject('rectangle', { x, y, width: w, height: h }),
            image: (x, y, key) => makeGenericObject('image', { x, y, key }),
            line: (x, y) => makeGenericObject('line', { x, y }),
            text: (x, y, text, style) => {
                const t = makeTextObject(x, y, text, style);
                texts.push(t);
                return t;
            }
        },
        make: { graphics: () => makeGenericObject('graphics') },
        input: new EventEmitter(),
        sound: { play() {} }
    };
    return scene;
}

// 1. fitTextToBox reduz fonte ate caber e respeita minFontSize.
{
    const longText = Array(18).fill('palavra longa para testar quebra de linha').join(' ');
    const t = makeTextObject(0, 0, longText, { fontSize: '18px' });
    const res = fitTextToBox(t, { maxWidth: 200, maxHeight: 120, maxFontSize: 18, minFontSize: 12 });
    assert.equal(res.fontSize, 12);
    assert.equal(res.fits, false);
    assert.equal(t.wrapWidth, 200);
    assert.ok(t.width <= 200);

    const mediumText = 'Texto de tamanho medio que cabe perfeitamente ao reduzir um pouco a fonte dentro da caixa.';
    const t2 = makeTextObject(0, 0, mediumText, { fontSize: '18px' });
    const res2 = fitTextToBox(t2, { maxWidth: 220, maxHeight: 90, maxFontSize: 18, minFontSize: 12 });
    assert.equal(res2.fits, true);
    assert.ok(res2.fontSize >= 12 && res2.fontSize <= 18);
    assert.ok(t2.height <= 90);
}

// 2. CharacterDescriptionPanel: todos os 9 personagens cabem na area bege da moldura (y <= 466, x <= 442).
{
    const panelTop = 284 - DESCRIPTION_PANEL_CONFIG.panelHeight / 2; // 60
    const innerBottom = panelTop + 417; // 477
    const innerRight = 256 + 200; // 456

    for (const id of Object.keys(characterData)) {
        const scene = createScene(0);
        const panel = new CharacterDescriptionPanel(scene, characterData);
        panel.open(id);
        const { title, description } = scene.characterOverlay;
        assert.ok(description.wrapWidth <= DESCRIPTION_PANEL_CONFIG.contentWidth, `${id}: wordWrap`);
        assert.ok(description.fontSize >= DESCRIPTION_PANEL_CONFIG.minFontSize, `${id}: fonte >= min`);
        assert.ok(description.x + description.width <= innerRight, `${id}: largura dentro da moldura`);
        assert.ok(description.y + description.height <= innerBottom, `${id}: altura (${description.y + description.height}) dentro da moldura (${innerBottom})`);
        assert.ok(title.x + title.width / 2 <= innerRight, `${id}: titulo dentro da moldura`);
        panel.close();
    }

    // Extras também cabem.
    for (const [extraId, pres] of Object.entries(SHOP_CHARACTER_PRESENTATIONS)) {
        const scene = createScene(0);
        const customData = { test: { nome: pres.name, descricao: pres.description, tipoSanguineo: 'B+' } };
        const panel = new CharacterDescriptionPanel(scene, customData);
        panel.open('test');
        const { description } = scene.characterOverlay;
        assert.ok(description.y + description.height <= innerBottom, `extra ${extraId}: dentro da moldura`);
        panel.close();
    }
}

// 3. GuidePanel nas Cidades 1 e 2: todos os textos das 4 abas e rotulos das abas tem wordWrap e cabem na moldura (x <= 455, y <= 432).
{
    for (const cityIndex of [0, 1]) {
        const scene = createScene(cityIndex);
        const panel = new GuidePanel(scene, { isClockRunning: false });
        for (const tab of ['tipos', 'aglutinacao', 'compatibilidade', 'contaminadas']) {
            if (!panel.isOpen) panel.open(tab);
            else panel.selectTab(tab);

            for (const tabBtn of panel.tabButtons) {
                assert.ok(tabBtn.label.width <= tabBtn.bg.width, `tabBtn=${tabBtn.id}: label cabe no botao`);
            }

            const textEls = panel.contentElements.filter((el) => el.kind === 'text');
            assert.ok(textEls.length > 0);
            for (const el of textEls) {
                const top = el.y - el.height * el.originY;
                const bottom = top + el.height;
                const left = el.x - el.width * el.originX;
                const right = left + el.width;
                assert.ok(left >= 56, `tab=${tab} city=${cityIndex}: left=${left} (${el.text})`);
                assert.ok(right <= 455, `tab=${tab} city=${cityIndex}: right=${right} (${el.text})`);
                assert.ok(top >= 78, `tab=${tab} city=${cityIndex}: top=${top} (${el.text})`);
                assert.ok(bottom <= 432, `tab=${tab} city=${cityIndex}: bottom=${bottom} (${el.text})`);
            }
        }
        panel.close();
    }
}

console.log('OK: fitTextToBox, CharacterDescriptionPanel e GuidePanel cabem nas molduras.');
