#!/usr/bin/env python3
"""Merge dated channel videos with the hand-curated livestream archive."""
import json, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
metadata=json.loads((ROOT/'data/youtube-metadata.json').read_text())
curated=json.loads((ROOT/'data/livestream-curation.json').read_text())
snapshot=json.loads((ROOT/'data/collection-summary.json').read_text())['snapshotDate']
include_shorts='--exclude-shorts' not in __import__('sys').argv
wanted={k:v for k,v in metadata.items() if '2022-01-01'<=v['date']<=min(snapshot,'2026-12-31') and (include_shorts or v['kind']!='short')}
manual_titles={
 'U9mJuUkhUzk':'DevDay 2023 開幕主題演講',
 'outcGtbnMuQ':'GPT-4 開發者直播',
 '4u218xVkjmQ':'OpenAI Scholars Demo Day 2019',
 'WRsxoVB8Yng':'OpenAI 機器人研討會 2019',
 'fdY7dt3ijgY':'Spinning Up 深度強化學習工作坊'}
for video_id in manual_titles:
    wanted[video_id]=metadata[video_id]

def normalized(text):
    return re.sub(r'[^\w]','',text.lower())

# Resolve earlier article-only records only when the official video title
# matches unambiguously. Prefer the replay when a launch promo shares its title.
for event in curated:
    if not event.get('video'):
        matches=[v for v in metadata.values() if normalized(v['title'])==normalized(event['en']) and v['date']==event['date']]
        streams=[v for v in matches if v['kind']=='livestream']
        if len(streams)==1:
            event['video']=streams[0]['id']
        elif len(matches)==1:
            event['video']=matches[0]['id']
replay_links={
 '2025-08-28':'nfBbmtMJhX0', '2025-06-04':'9lSRViLugE0',
 '2025-05-16':'hhdpnbfH6NU', '2025-04-16':'sq8GBPUb3rk',
 '2025-04-14':'kA-P9ood-cE', '2025-03-25':'2f3K43FHRKo',
 '2025-03-20':'lXb0L16ISAc', '2025-03-11':'hciNKcLwSes',
 '2025-02-27':'cfRYp0nItZ8', '2025-02-02':'YkCDVn3_wiw',
 '2025-01-23':'CSE77wAdDLg'}
for event in curated:
    if not event.get('video') and event['date'] in replay_links:
        video_id=replay_links[event['date']]
        assert metadata[video_id]['date']==event['date']
        event['video']=video_id
curated_by_video={e['video']:e for e in curated if e.get('video')}
records=[]
for video_id,video in wanted.items():
    event=curated_by_video.get(video_id,{})
    records.append({
        'id':event.get('id','youtube-'+video_id),
        'video':video_id,
        'date':event.get('date',video['date']),
        'publishedAt':video['publishedAt'],
        'title':event.get('title',manual_titles.get(video_id,video['title'])),
        'en':event.get('en',video['title']) if event or video_id in manual_titles else '',
        'source':video['source'],
        'kind':video['kind'],
        'duration':video['duration'],
        **({'description':event['description']} if event.get('description') else {}),
        **({'image':event['image']} if event.get('image') else {}),
    })
# Keep verified official archive events whose replay ID was not unambiguously
# linked to the channel snapshot. They retain their official article link.
for event in curated:
    if not event.get('video') or event['video'] not in wanted:
        records.append({**event,'kind':'livestream'})
records.sort(key=lambda e:(e['date'],e.get('publishedAt','')),reverse=True)
assert len({r['id'] for r in records})==len(records)
video_ids=[r['video'] for r in records if r.get('video')]
assert len(video_ids)==len(set(video_ids))
assert all(video_id in video_ids for video_id in manual_titles)
(ROOT/'dist/events.js').write_text('window.ARCHIVE_EVENTS='+json.dumps(records,ensure_ascii=False,indent=2)+';\n')
summary={'snapshotDate':snapshot,'mainRange':'2022–2026','mainVideoCount':len([v for v in wanted.values() if v['date']>='2022-01-01']),'supplemental2019Count':3,'articleOnlyCount':sum(not r.get('video') for r in records),'totalRecords':len(records),'mainKinds':{kind:sum(v['kind']==kind and v['date']>='2022-01-01' for v in wanted.values()) for kind in ['video','livestream','short']}}
(ROOT/'data/catalog-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False))
