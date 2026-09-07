"""Generate a JPG reference sheet for project user credentials."""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

OUTPUT = Path(__file__).resolve().parent.parent / "assets" / "project-user-credentials.jpg"

FONTS = Path("C:/Windows/Fonts")
FONT_REG = str(FONTS / "segoeui.ttf")
FONT_BOLD = str(FONTS / "segoeuib.ttf")
FONT_MONO = str(FONTS / "consola.ttf")

OSMANABAD = {
    "title": "OSMANABAD PWD — User Credentials (Number: 29)",
    "project": "OSMANABAD PWD",
    "rows": [
        ("1", "OSMANABAD TL", "pmc_tl29", "Team Leader", "osmanabadie@scplasia.com", "Pmc@TL29"),
        ("2", "OSMANABAD SE", "pmc_se29", "Site Engineer", "Not required", "Pmc@SE29"),
        ("3", "OSMANABAD QAQC", "pmc_qaqc29", "QAQC Site Engineer", "Not required", "Pmc@QAQC29"),
        ("4", "OSMANABAD BSE", "pmc_bse29", "Billing Site Engineer", "Not required", "Pmc@BSE29"),
        ("5", "OSMANABAD HSE", "pmc_hse29", "HSE Site Engineer", "Not required", "Pmc@HSE29"),
    ],
}

KOPRI = {
    "title": "KOPRI — User Credentials (Number: 28)",
    "project": "KOPRI",
    "rows": [
        ("1", "KOPRI TL", "pmc_tl28", "Team Leader", "koprirob@scplasia.com", "Pmc@TL28"),
        ("2", "KOPRI SE", "pmc_se28", "Site Engineer", "Not required", "Pmc@SE28"),
        ("3", "KOPRI QAQC", "pmc_qaqc28", "QAQC Site Engineer", "Not required", "Pmc@QAQC28"),
        ("4", "KOPRI BSE", "pmc_bse28", "Billing Site Engineer", "Not required", "Pmc@BSE28"),
        ("5", "KOPRI HSE", "pmc_hse28", "HSE Site Engineer", "Not required", "Pmc@HSE28"),
    ],
}

HEADERS = ["#", "Full Name", "Username", "Role", "Email", "Password"]
COL_WIDTHS = [36, 170, 110, 180, 250, 110]
TABLE_WIDTH = sum(COL_WIDTHS) + 40
MARGIN_X = 48
ROW_H = 34
HEADER_H = 40


def load_fonts():
    return {
        "title": ImageFont.truetype(FONT_BOLD, 22),
        "subtitle": ImageFont.truetype(FONT_BOLD, 13),
        "header": ImageFont.truetype(FONT_BOLD, 12),
        "cell": ImageFont.truetype(FONT_REG, 12),
        "mono": ImageFont.truetype(FONT_MONO, 11),
        "footer": ImageFont.truetype(FONT_BOLD, 13),
        "doc_title": ImageFont.truetype(FONT_BOLD, 28),
        "doc_sub": ImageFont.truetype(FONT_REG, 13),
    }


def text_size(draw, text, font):
    box = draw.textbbox((0, 0), text, font=font)
    return box[2] - box[0], box[3] - box[1]


def draw_table(draw, fonts, x, y, block):
    title = block["title"]
    draw.text((x, y), title, fill="#1e293b", font=fonts["title"])
    y += 38

    # Header row background
    draw.rounded_rectangle(
        (x, y, x + TABLE_WIDTH, y + HEADER_H),
        radius=8,
        fill="#4338ca",
    )
    cx = x + 12
    for i, header in enumerate(HEADERS):
        draw.text((cx, y + 12), header, fill="#ffffff", font=fonts["header"])
        cx += COL_WIDTHS[i]

    y += HEADER_H
    for idx, row in enumerate(block["rows"]):
        bg = "#f8fafc" if idx % 2 == 0 else "#eef2ff"
        draw.rectangle((x, y, x + TABLE_WIDTH, y + ROW_H), fill=bg, outline="#e2e8f0")
        cx = x + 12
        for col_i, cell in enumerate(row):
            font = fonts["mono"] if col_i in (2, 5) else fonts["cell"]
            color = "#64748b" if cell == "Not required" else "#0f172a"
            if col_i == 4 and cell != "Not required":
                color = "#0369a1"
            draw.text((cx, y + 10), cell, fill=color, font=font)
            cx += COL_WIDTHS[col_i]
        y += ROW_H

    y += 10
    draw.text(
        (x, y),
        f"Project to assign: {block['project']}",
        fill="#4338ca",
        font=fonts["footer"],
    )
    return y + 34


def main():
    fonts = load_fonts()
    height = 180 + (HEADER_H + ROW_H * 5 + 72) * 2
    img = Image.new("RGB", (TABLE_WIDTH + MARGIN_X * 2, height), "#ffffff")
    draw = ImageDraw.Draw(img)

    # Document header band
    draw.rounded_rectangle(
        (MARGIN_X - 8, 24, MARGIN_X + TABLE_WIDTH + 8, 110),
        radius=12,
        fill="#eef2ff",
        outline="#c7d2fe",
    )
    draw.text(
        (MARGIN_X + 8, 38),
        "PMC Portal — Project User Credentials",
        fill="#312e81",
        font=fonts["doc_title"],
    )
    draw.text(
        (MARGIN_X + 8, 78),
        "Team Leader gets email; Site Engineer roles do not require email.",
        fill="#475569",
        font=fonts["doc_sub"],
    )

    y = 130
    y = draw_table(draw, fonts, MARGIN_X, y, OSMANABAD)
    draw.line((MARGIN_X, y, MARGIN_X + TABLE_WIDTH, y), fill="#cbd5e1", width=+2)
    y += 18
    draw_table(draw, fonts, MARGIN_X, y, KOPRI)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUTPUT, "JPEG", quality=95, optimize=True)
    print(f"Saved: {OUTPUT}")


if __name__ == "__main__":
    main()
