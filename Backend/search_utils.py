import json
import hashlib
from datetime import datetime, timedelta
from duckduckgo_search import DDGS
from sqlalchemy.orm import Session
import models

# Allowed Domains Whitelist
TRUSTED_DOMAINS = [
    "gov.in", "nic.in", "nsdcindia.org", "skillindia.gov.in",
    "startupindia.gov.in", "digitalindia.gov.in", "ncs.gov.in",
    "dgt.gov.in", "apprenticeshipindia.gov.in"
]

def is_trusted_domain(url):
    for domain in TRUSTED_DOMAINS:
        if domain in url:
            return True
    return False

def get_query_hash(query_str):
    return hashlib.md5(query_str.encode()).hexdigest()

def search_opportunities(db: Session, profession: str, state: str, district: str):
    """
    Orchestrates the search for Schemes and Training.
    Checks cache first (24h validity).
    """
    # 1. Construct Queries
    # Scheme Query: broader, state level
    scheme_query = f'site:gov.in OR site:nic.in OR site:nsdcindia.org "{profession} scheme" "{state}"'
    
    # Training Query: local, district level
    training_query = f'site:gov.in OR site:nic.in OR site:nsdcindia.org "{profession} training" "{district}"'

    # 2. Check Cache
    combined_key = f"{profession}_{state}_{district}"
    q_hash = get_query_hash(combined_key)
    
    cached = db.query(models.OpportunityCache).filter(models.OpportunityCache.query_hash == q_hash).first()
    
    if cached:
        # Check freshness (24h)
        if cached.created_at > datetime.utcnow() - timedelta(hours=24):
            print(f"✅ Serving cached opportunities for {combined_key}")
            return json.loads(cached.data_json)
        else:
            print(f"⚠️ Cache expired for {combined_key}, refetching...")
            db.delete(cached)
            db.commit()

    # 3. Fetch from DuckDuckGo
    print(f"🔎 Fetching live from DDG for {combined_key}...")
    
    schemes = fetch_ddg_results(scheme_query, category="Scheme")
    trainings = fetch_ddg_results(training_query, category="Training")
    
    # 4. Format Result
    final_result = {
        "schemes": schemes,
        "trainings": trainings,
        "last_updated": datetime.utcnow().isoformat()
    }
    
    # 5. Save to Cache
    new_cache = models.OpportunityCache(
        query_hash=q_hash,
        data_json=json.dumps(final_result)
    )
    db.add(new_cache)
    db.commit()
    
    return final_result

def fetch_ddg_results(query, category):
    results = []
    try:
        with DDGS() as ddgs:
            # Fetch 10 results
            ddg_gen = ddgs.text(query, max_results=10)
            if ddg_gen:
                for r in ddg_gen:
                    url = r.get("href", "")
                    if is_trusted_domain(url):
                        results.append({
                            "title": r.get("title"),
                            "url": url,
                            "summary": r.get("body"),
                            "source": url.split("/")[2], # Extract domain
                            "category": category
                        })
    except Exception as e:
        print(f"❌ DDG Error: {e}")
        
    return results
