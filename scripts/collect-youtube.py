#!/usr/bin/env python3
"""Collect a dated snapshot of the official OpenAI YouTube channel.
Requires yt-dlp on PATH. Downloads metadata only, never video media.
"""
import concurrent.futures, datetime, json, re, subprocess, time, urllib.request
from pathlib import Path
CHANNEL_ID = 'UCXZCJLdBC09xxGZ6gcdrc6A'
CHANNEL = 'https://www.youtube.com/@OpenAI/'
ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'data' / 'youtube-metadata.json'

def json_get(url):
    with urllib.request.urlopen(url, timeout=30) as response:
        return json.load(response)

def player_from_html(video_id):
    with urllib.request.urlopen('https://www.youtube.com/watch?v='+video_id, timeout=30) as response:
        html = response.read().decode()
    marker = 'var ytInitialPlayerResponse = '
    pos = html.find(marker)
    if pos < 0:
        raise ValueError('No player metadata for '+video_id)
    player, _ = json.JSONDecoder().raw_decode(html[pos+len(marker):])
    config = json.loads(re.search(r'ytcfg.set\((\{.*?\})\);', html).group(1))
    return player, config

def main():
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    entries = {}
    counts = {}
    for kind in ['videos', 'streams', 'shorts']:
        local = Path('/tmp/openai-all-'+kind+'.json') if __import__('os').environ.get('OPENAI_REUSE_LISTINGS') == '1' else Path('/tmp/no-reused-listing')
        # Reuse the listing fetched in the current run when requested by this task.
        if local.exists():
            listing = json.loads(local.read_text())
        else:
            listing = json.loads(subprocess.check_output(['yt-dlp', '--flat-playlist', '--dump-single-json', '--skip-download', '--ignore-errors', '--no-warnings', CHANNEL+kind], text=True))
        if listing.get('channel_id') != CHANNEL_ID:
            raise ValueError('Unexpected source channel')
        counts[kind] = len(listing.get('entries', []))
        for entry in listing.get('entries', []):
            video_id = entry.get('id')
            if not video_id:
                continue
            entries[video_id] = {**entry, 'kind': {'videos':'video','streams':'livestream','shorts':'short'}[kind]}
    _, config = player_from_html('U9mJuUkhUzk')
    context = config['INNERTUBE_CONTEXT']
    endpoint = 'https://www.youtube.com/youtubei/v1/player?key='+config['INNERTUBE_API_KEY']+'&prettyPrint=false'
    def collect(item):
        video_id, entry = item
        if video_id in cache and cache[video_id].get('date'):
            return {**cache[video_id], 'kind':entry['kind']}
        error = None
        for attempt in range(3):
            try:
                if attempt < 2:
                    request = urllib.request.Request(endpoint, data=json.dumps({'context':context,'videoId':video_id}).encode(), headers={'Content-Type':'application/json','User-Agent':'Mozilla/5.0'})
                    with urllib.request.urlopen(request, timeout=25) as response:
                        player = json.load(response)
                else:
                    player, _ = player_from_html(video_id)
                details = player.get('videoDetails', {})
                micro = player.get('microformat', {}).get('playerMicroformatRenderer', {})
                date = micro.get('publishDate') or micro.get('uploadDate')
                if not date or not details.get('title'):
                    raise ValueError('Missing title or publish date')
                if details.get('channelId') != CHANNEL_ID:
                    raise ValueError('Unexpected video channel')
                return {'id':video_id, 'title':details['title'].strip(), 'date':date[:10], 'publishedAt':date, 'channelId':CHANNEL_ID, 'channel':details.get('author'), 'kind':entry['kind'], 'duration':int(details.get('lengthSeconds') or entry.get('duration') or 0), 'source':'https://www.youtube.com/watch?v='+video_id}
            except Exception as exc:
                error = str(exc)
                time.sleep(.15)
        return {'id':video_id, 'title':entry.get('title'), 'kind':entry['kind'], 'error':error}
    result = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for item in pool.map(collect, entries.items()):
            result.append(item)
            if len(result) % 100 == 0:
                print('Metadata checked:', len(result), '/', len(entries), flush=True)
    cache.update({item['id']:item for item in result if item.get('date')})
    CACHE.parent.mkdir(exist_ok=True)
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2)+'\n')
    summary = {'source':CHANNEL, 'channelId':CHANNEL_ID, 'snapshotDate':datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).date().isoformat(), 'listingCounts':counts, 'uniqueVideos':len(entries), 'datedVideos':sum(bool(v.get('date')) for v in result), 'errors':[v for v in result if v.get('error')]}
    (ROOT/'data'/'collection-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(summary, ensure_ascii=False),flush=True)
if __name__ == '__main__':
    main()
