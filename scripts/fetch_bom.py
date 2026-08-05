"""
Fetches live BOM station observations, wind warnings, the BOM wind forecast
bulletin and Ports Victoria shipping movements for Port Phillip, and writes
them to a single live.json.

Run on a schedule by .github/workflows/fetch-bom-data.yml, which publishes
the output to the 'data' branch (not main) so it can be fetched client-side
from raw.githubusercontent.com without touching the site's build/deploy.

Each section is independent and defensively wrapped: a single BOM/Ports
Victoria outage should not stop the other sections from publishing.
"""

import argparse
import json
import os
import traceback
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup
from dateutil import parser as dateparser

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-AU,en;q=0.9",
    "Referer": "https://www.bom.gov.au/",
}
MELBOURNE = ZoneInfo("Australia/Melbourne")

# BOM automatic weather station numbers for the real stations around Port
# Phillip, keyed by the product family the station's page lives under (most
# are "Latest Weather Observations" IDV60801; St Kilda Harbour is only
# published under the "Latest Capital City Observations" product IDV60901).
BOM_STATIONS = {
    "fawkner": ("IDV60801", 95872),
    "frankston": ("IDV60801", 94871),
    "point-wilson": ("IDV60801", 94847),
    "south-channel": ("IDV60801", 94853),
    "melbourne-airport": ("IDV60801", 94866),
    "st-kilda": ("IDV60901", 95864),
}

COMPASS_DEG = {
    "N": 0, "NNE": 22.5, "NE": 45, "ENE": 67.5,
    "E": 90, "ESE": 112.5, "SE": 135, "SSE": 157.5,
    "S": 180, "SSW": 202.5, "SW": 225, "WSW": 247.5,
    "W": 270, "WNW": 292.5, "NW": 315, "NNW": 337.5,
    "CALM": None,
}


def log_error(label: str) -> None:
    print(f"[{label}] failed:")
    traceback.print_exc()


def parse_bom_local_time(raw: str | None) -> str | None:
    # BOM "local_date_time_full" looks like "20260805203600".
    if not raw or len(raw) < 14:
        return None
    try:
        dt = datetime.strptime(raw, "%Y%m%d%H%M%S").replace(tzinfo=MELBOURNE)
        return dt.isoformat(timespec="seconds")
    except ValueError:
        return None


def fetch_station(station_id: str, product: str, wmo: int) -> dict | None:
    url = f"https://www.bom.gov.au/fwo/{product}/{product}.{wmo}.json"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
        entries = r.json()["observations"]["data"]
        if not entries:
            return None
        latest = entries[0]

        wind_kt = latest.get("wind_spd_kt")
        gust_kt = latest.get("gust_kt")
        compass = (latest.get("wind_dir") or "").upper()
        dir_deg = COMPASS_DEG.get(compass)

        if wind_kt is None or dir_deg is None:
            return None

        return {
            "windKt": wind_kt,
            "gustKt": gust_kt if gust_kt is not None else wind_kt,
            "dirCompass": compass,
            "dirDeg": dir_deg,
            "airTemp": latest.get("air_temp"),
            "observedAt": parse_bom_local_time(latest.get("local_date_time_full")),
        }
    except Exception:
        log_error(f"station:{station_id}")
        return None


def fetch_stations() -> dict:
    stations = {}
    for station_id, (product, wmo) in BOM_STATIONS.items():
        reading = fetch_station(station_id, product, wmo)
        if reading:
            stations[station_id] = reading
    return stations


def fetch_warnings() -> dict:
    result = {"strong": False, "gale": False, "storm": False, "rawText": None}
    url = "https://www.bom.gov.au/fwo/IDV20600.txt"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
        text = r.text
        result["rawText"] = text
        lower = text.lower()

        current_warning = None
        for line in lower.splitlines():
            line = line.strip()
            if "storm force warning" in line:
                current_warning = "storm"
            elif "gale warning" in line:
                current_warning = "gale"
            elif "strong wind warning" in line:
                current_warning = "strong"

            if "port phillip" in line and current_warning:
                result[current_warning] = True
    except Exception:
        log_error("warnings")
    return result


def fetch_forecast_text() -> str | None:
    url = "http://www.bom.gov.au/fwo/IDV10460.txt"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
        lines = r.text.splitlines()

        capture = False
        block: list[str] = []

        for line in lines:
            l = line.strip().lower()

            if "forecast for" in l and "until midnight" in l:
                capture = True
                block.append(line)
                continue

            if capture and l.startswith("forecast for") and "until midnight" not in l:
                break

            if capture:
                block.append(line)

        return "\n".join(block).strip() or None
    except Exception:
        log_error("forecast_text")
        return None


def fetch_shipping() -> dict:
    result = {"arrivals": [], "departures": []}
    url = "https://ports.vic.gov.au/marine-operations/ship-movements/"

    try:
        r = requests.get(url, headers=HEADERS, timeout=20)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")

        def extract_table(header_text: str) -> list[dict]:
            header = soup.find(
                lambda tag: tag.name in ["h2", "h3"]
                and header_text.lower() in tag.get_text(strip=True).lower()
            )
            if not header:
                return []

            table = header.find_next("table")
            if not table:
                return []

            rows = table.find_all("tr")[1:]
            data = []
            cutoff = datetime.now(MELBOURNE) + timedelta(hours=12)

            for row in rows:
                cols = row.find_all("td")
                if len(cols) < 4:
                    continue
                try:
                    dt = dateparser.parse(cols[1].get_text(strip=True), dayfirst=True)
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=MELBOURNE)
                except Exception:
                    continue

                if dt > cutoff:
                    continue

                data.append(
                    {
                        "ship": cols[0].get_text(strip=True),
                        "datetime": dt.strftime("%d/%m/%Y %H:%M"),
                        "from": cols[2].get_text(strip=True),
                        "to": cols[3].get_text(strip=True),
                    }
                )
            return data

        result["arrivals"] = extract_table("Expected Arrivals")
        result["departures"] = extract_table("Expected Departures")
    except Exception:
        log_error("shipping")

    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default="live.json")
    args = parser.parse_args()

    payload = {
        "generatedAt": datetime.now(MELBOURNE).isoformat(timespec="seconds"),
        "stations": fetch_stations(),
        "warnings": fetch_warnings(),
        "forecastText": fetch_forecast_text(),
        "shipping": fetch_shipping(),
    }

    out_dir = os.path.dirname(args.out)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print(f"Wrote {args.out}: {len(payload['stations'])} stations, "
          f"{len(payload['shipping']['arrivals'])} arrivals, "
          f"{len(payload['shipping']['departures'])} departures")


if __name__ == "__main__":
    main()
