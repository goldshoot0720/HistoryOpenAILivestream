#!/usr/bin/env python3
"""Collect source caption tracks without downloading audiovisual media.
YouTube translations can be rate-limited; unavailable languages stay explicit.
"""
import argparse, concurrent.futures, html, json, subprocess, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist'/'subtitles'

def convert(payload):
    cues=[]
    for event in payload.get('events',[]):
        text=''.join(segment.get('utf8','') for segment in event.get('segs',[]))
        text=html.unescape(text).strip()
        start=event.get('tStartMs',0)/1000
        end=start+event.get('dDurationMs',0)/1000
        if text and end>start:
            cues.append({'start':round(start,3),'end':round(end,3),'text':text})
    cues.sort(key=lambda cue:cue['start'])
    # Rolling ASR captions overlap; display the latest update rather than an old line.
    for i in range(len(cues)-1):
        if cues[i+1]['start']>cues[i]['start']:
            cues[i]['end']=min(cues[i]['end'],cues[i+1]['start'])
    return cues

def collect(video_id, translate=False):
    target=OUT/(video_id+'.json')
    old=json.loads(target.read_text()) if target.exists() else {'zh':[],'en':[],'sources':{}}
    errors={}
    try:
        run=subprocess.run(['yt-dlp','--skip-download','--dump-single-json','--no-warnings','--socket-timeout','15','https://www.youtube.com/watch?v='+video_id],capture_output=True,text=True,timeout=75)
        if run.returncode:
            raise ValueError(run.stderr.strip().splitlines()[-1])
        info=json.loads(run.stdout)
        if info.get('channel_id')!='UCXZCJLdBC09xxGZ6gcdrc6A':
            raise ValueError('Unexpected source channel')
        manual,auto=info.get('subtitles',{}),info.get('automatic_captions',{})
        for language,prefixes in [('en',['en']),('zh',['zh-Hant','zh-TW','zh'])]:
            if old.get(language):
                continue
            keys=[key for key in manual if any(key==p or key.startswith(p+'-') for p in prefixes)]
            kind='publisher'
            bank=manual
            if not keys:
                bank=auto;kind='youtube-asr' if language=='en' else 'youtube-auto-translation'
                if language=='en':
                    keys=[key for key in ['en-orig','en'] if key in auto]
                elif translate:
                    keys=[key for key in ['zh-Hant','zh-TW'] if key in auto]
            if not keys:
                errors[language]='No downloadable source track' if language=='en' else 'Chinese track unavailable; use YouTube automatic translation'
                continue
            key=keys[0]
            item=next((track for track in bank[key] if track.get('ext')=='json3'),None)
            if not item:
                errors[language]='No JSON3 caption format';continue
            try:
                request=urllib.request.Request(item['url'],headers={'User-Agent':'Mozilla/5.0'})
                with urllib.request.urlopen(request,timeout=20) as response:
                    cues=convert(json.load(response))
                if not cues: raise ValueError('Empty caption track')
                old[language]=cues
                old['sources'][language]={'kind':kind,'language':key,'url':'https://www.youtube.com/watch?v='+video_id}
            except Exception as error:
                errors[language]=str(error)
        if old.get('en') or old.get('zh'):
            target.write_text(json.dumps(old,ensure_ascii=False,separators=(',',':'))+'\n')
        return video_id,{'en':len(old.get('en',[])),'zh':len(old.get('zh',[])),'errors':errors}
    except Exception as error:
        return video_id,{'en':len(old.get('en',[])),'zh':len(old.get('zh',[])),'errors':{'source':str(error)}}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--translate',action='store_true');parser.add_argument('--ids',nargs='*');args=parser.parse_args()
    OUT.mkdir(exist_ok=True)
    metadata=json.loads((ROOT/'data'/'youtube-metadata.json').read_text())
    ids=args.ids or list(metadata)
    results={}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for video_id,status in pool.map(lambda video_id:collect(video_id,args.translate),ids):
            results[video_id]=status
            print(video_id, 'en:',status['en'],'zh:',status['zh'],flush=True)
    (ROOT/'data'/'subtitle-collection-summary.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
    available={}
    for video_id in metadata:
        path=OUT/(video_id+'.json')
        if path.exists():
            data=json.loads(path.read_text());available[video_id]={language:len(data.get(language,[])) for language in ['en','zh']}
    (OUT/'manifest.js').write_text('window.ARCHIVE_SUBTITLES='+json.dumps(available,separators=(',',':'))+';\n')
