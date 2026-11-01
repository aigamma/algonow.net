"""Insert one draft registry record into src/data/engineering.js from a JSON
file, escaping apostrophes for the single-quoted JS strings, and check the
search-facing lengths. Usage: python add_record.py <record.json>"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
registry = ROOT / "src/data/engineering.js"
record = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
assert len(record["pageTitle"]) <= 50, ("pageTitle too long", len(record["pageTitle"]))
assert 60 <= len(record["description"]) <= 155, ("description length", len(record["description"]))
assert record["pageTitle"] != record["title"]
assert "\u2014" not in json.dumps(record)


def js(value):
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"


lines = ["  {"]
for key in ["slug", "title", "pageTitle", "description", "summary", "track", "language", "status"]:
    lines.append(f"    {key}: {js(record[key])},")
lines.append(f"    difficulty: {js(record['difficulty'])},")
lines.append(f"    durationMinutes: {int(record['durationMinutes'])},")
lines.append("    skills: [" + ", ".join(js(skill) for skill in record["skills"]) + "],")
lines.append("    authoringModel: 'Claude Fable 5',")
lines.append("  },")
block = "\n".join(lines) + "\n"
source = registry.read_text(encoding="utf-8")
marker = "].map(Object.freeze));\n\nexport function publishedScenarios"
assert source.count(marker) == 1, "registry marker not found exactly once"
assert f"slug: '{record['slug']}'" not in source, "slug already registered"
registry.write_text(source.replace(marker, block + marker), encoding="utf-8")
print("registered draft", record["slug"], "pageTitle", len(record["pageTitle"]), "description", len(record["description"]))
