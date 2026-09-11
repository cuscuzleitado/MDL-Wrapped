/**
 * MDL Wrapped — gerador automático
 *
 * Uso:
 *   node generate-wrapped.js <username> [ano] [cor]
 *
 * Cores disponíveis: purple (padrão), blue, rose, green, gold
 *
 * Exemplo:
 *   node generate-wrapped.js cuscuzcomleite 2025 blue
 *
 * Requisitos (rodar uma vez):
 *   npm init -y
 *   npm install puppeteer
 *
 * O que ele faz:
 *   1. Abre https://mydramalist.com/profile/<username>/year/<ano> num Chrome headless
 *   2. Roda a extração (mesma lógica do mdl-wrapped-extractor.js) dentro da página
 *   3. Abre o template.html localmente e injeta os dados reais via window.renderWrapped()
 *   4. Espera todas as imagens carregarem e tira um screenshot só do card
 *   5. Salva um PNG pronto: <username>-wrapped-<ano>.png
 */

const path = require("path");
const puppeteer = require("puppeteer");

const username = process.argv[2];
const year = process.argv[3] || "2025";
const themeArg = (process.argv[4] || "purple").toLowerCase();

const THEMES = {
  purple: ["#a855f7", "#e879f9"],
  blue: ["#3b82f6", "#22d3ee"],
  rose: ["#f43f5e", "#fb7185"],
  green: ["#22c55e", "#4ade80"],
  gold: ["#f59e0b", "#fbbf24"],
};

if (!username) {
  console.error("Uso: node generate-wrapped.js <username> [ano] [cor]");
  console.error(`Cores disponíveis: ${Object.keys(THEMES).join(", ")}`);
  process.exit(1);
}

const [themeC1, themeC2] = THEMES[themeArg] || THEMES.purple;

// Mesma lógica do mdl-wrapped-extractor.js, mas retornando o objeto
// em vez de imprimir no console (aqui ela roda dentro do page.evaluate).
function extractDataFromPage() {
  const data = {};
  data.username = window.location.pathname.split("/")[2] || "";

  data.stats = {};
  document.querySelectorAll(".row.stats > div").forEach((el) => {
    const num = el.querySelector(".num")?.textContent.trim();
    const unit = el.querySelector(".unit")?.textContent.trim();
    if (unit) data.stats[unit] = num;
  });

  function findSectionAfterHeading(text) {
    const headings = [...document.querySelectorAll("h2, h3")];
    const h = headings.find((el) => el.textContent.trim() === text);
    return h ? h.nextElementSibling : null;
  }

  function extractTimeStats(container) {
    if (!container) return [];
    const result = [];
    container.querySelectorAll(".mdl-col-num").forEach((col) => {
      const nums = [...col.querySelectorAll(".num")].map((n) => n.textContent.trim());
      const units = [...col.querySelectorAll(".unit")].map((u) => u.textContent.trim());
      nums.forEach((n, i) => result.push({ value: n, unit: units[i] }));
    });
    return result;
  }
  // Only keep Total Episodes / Total Hours (that's all the template uses)
  const fullDramaTime = extractTimeStats(findSectionAfterHeading("Drama Time"));
  const fullMovieTime = extractTimeStats(findSectionAfterHeading("Movie Time"));
  data.dramaTime = fullDramaTime.filter((t) => t.unit === "Total Episodes" || t.unit === "Total Hours");
  data.movieTime = fullMovieTime.filter((t) => t.unit === "Total Hours");

  function getChartData(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    try {
      return JSON.parse(el.getAttribute("data-data"));
    } catch (e) {
      return null;
    }
  }
  data.topGenres = getChartData("top_genres");
  data.topCountries = getChartData("top_countries");
  data.monthlyUpdates = getChartData("most_updates_month");

  const monthAbbr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (data.monthlyUpdates) {
    const maxIdx = data.monthlyUpdates.indexOf(Math.max(...data.monthlyUpdates));
    data.mostActiveMonth = monthAbbr[maxIdx];
  }
  if (data.topGenres && data.topGenres.length) data.topGenre = data.topGenres[0].label;
  if (data.topCountries && data.topCountries.length) data.topCountry = data.topCountries[0];

  const streakHeading = [...document.querySelectorAll("h2")].find((h) =>
    /Longest Streak Of Updates/i.test(h.textContent)
  );
  if (streakHeading) {
    const match = streakHeading.textContent.match(/(\d+)/);
    data.longestStreak = match ? parseInt(match[1], 10) : null;
  }

  function extractFilms(container) {
    if (!container) return [];
    return [...container.querySelectorAll(".film")].map((f) => ({
      title: f.querySelector(".title")?.textContent.trim(),
      score: f.querySelector(".score")?.textContent.trim(),
      poster: f.querySelector("img")?.getAttribute("src"),
    }));
  }
  data.topRatedDramas = extractFilms(findSectionAfterHeading("Your Top Rated Dramas"));
  data.topRatedMovies = extractFilms(findSectionAfterHeading("Your Top Rated Movies"));

  function extractPeople(container, limit) {
    if (!container) return [];
    return [...container.querySelectorAll(".person")].slice(0, limit).map((p) => ({
      name: p.querySelector(".name")?.textContent.trim(),
      count: p.querySelector(".count")?.textContent.trim(),
      photo: p.querySelector("img")?.getAttribute("src"),
    }));
  }
  data.topActresses = extractPeople(findSectionAfterHeading("Most Watched Actresses"), 3);
  data.topActors = extractPeople(findSectionAfterHeading("Most Watched Actors"), 3);

  return data;
}

async function main() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  });

  // ---- 1) Extract data from the real MDL page ----
  const sourcePage = await browser.newPage();
  await sourcePage.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
  );
  await sourcePage.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });
  await sourcePage.setViewport({ width: 1366, height: 900 });

  const url = `https://mydramalist.com/profile/${username}/year/${year}`;
  console.log(`Abrindo ${url} ...`);
  await sourcePage.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

  const found = await sourcePage
    .waitForSelector("#year-in-review", { timeout: 15000 })
    .then(() => true)
    .catch(() => false);

  if (!found) {
    // Salva diagnóstico em vez de só desistir, pra dar pra ver o que aconteceu
    const debugHtmlPath = path.join(__dirname, "debug-page.html");
    const debugPngPath = path.join(__dirname, "debug-page.png");
    const title = await sourcePage.title();
    const html = await sourcePage.content();
    require("fs").writeFileSync(debugHtmlPath, html, "utf-8");
    await sourcePage.screenshot({ path: debugPngPath, fullPage: false });
    console.error("Não encontrei a página de year-in-review.");
    console.error(`Título da página recebida: "${title}"`);
    console.error(`Salvei o que o script realmente recebeu em:`);
    console.error(`  - ${debugHtmlPath}`);
    console.error(`  - ${debugPngPath}`);
    console.error("Dá uma olhada nesses arquivos (ou manda pra mim) pra a gente ver o que está bloqueando.");
    await browser.close();
    process.exit(1);
  }

  const scraped = await sourcePage.evaluate(extractDataFromPage);
  scraped.year = year;
  await sourcePage.close();
  console.log(`Dados extraídos para @${username}.`);

  // ---- 2) Load the local template and inject the real data ----
  const templatePage = await browser.newPage();
  await templatePage.setViewport({ width: 1000, height: 1600 });
  const templatePath = path.join(__dirname, "mdl-wrapped-template.html");
  await templatePage.goto(`file://${templatePath}`, { waitUntil: "networkidle2" });

  await templatePage.evaluate((d) => window.renderWrapped(d), scraped);
  await templatePage.evaluate(
    (c1, c2) => {
      document.documentElement.style.setProperty("--accent-1", c1);
      document.documentElement.style.setProperty("--accent-2", c2);
    },
    themeC1,
    themeC2
  );

  // Wait for every image (posters + person photos, proxied through weserv) to finish loading
  await templatePage.evaluate(async () => {
    const imgs = Array.from(document.querySelectorAll("#card img"));
    await Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
            })
      )
    );
  });

  // ---- 3) Screenshot just the card, at 2x for a crisp image ----
  await templatePage.setViewport({ width: 1000, height: 1600, deviceScaleFactor: 2 });
  const card = await templatePage.$("#card");
  const outputPath = path.join(__dirname, `${username}-wrapped-${year}.png`);
  await card.screenshot({ path: outputPath });

  await browser.close();
  console.log(`Pronto! Imagem salva em: ${outputPath}`);
}

main().catch((err) => {
  console.error("Deu erro:", err);
  process.exit(1);
});
