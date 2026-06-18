from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
import pandas as pd
import os
from dotenv import load_dotenv

# ✅ load env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI()

# ✅ allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ topic assignment
def assign_topic(title):
    t = title.lower()

    if "wallet" in t or "eudi" in t:
        return "Wallet"
    if "eidas" in t or "regulation" in t:
        return "Regulation"
    if "verification" in t or "age" in t:
        return "Verification"
    if "security" in t or "encryption" in t:
        return "Security"
    if "government" in t or "bund" in t:
        return "Public Sector"

    return "Other"


@app.get("/articles")
def get_articles():
    conn = psycopg2.connect(DATABASE_URL, sslmode="require")

    df = pd.read_sql(
        "SELECT * FROM news_articles ORDER BY published_at DESC",
        conn
    )

    conn.close()

    # ✅ ADD topic column
    df["topic"] = df["title"].apply(assign_topic)

    return df.to_dict(orient="records")
