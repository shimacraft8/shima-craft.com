/** Local derivative generation. Choices require a recorded visual review. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'..');
const runtime=process.env.WILDLIFE_SHARP_PACKAGE;
if(!runtime)throw new Error('Set WILDLIFE_SHARP_PACKAGE to an installed package.json containing sharp');
const sharp=createRequire(path.resolve(runtime))('sharp');
const reviews=JSON.parse(fs.readFileSync(path.join(root,'docs/illustration-review.json')));
const metadata=JSON.parse(fs.readFileSync(path.join(root,'data/illustrations.json')));
const choices=fs.existsSync(path.join(root,'data/illustration-choices.json'))?JSON.parse(fs.readFileSync(path.join(root,'data/illustration-choices.json'))):{};
const latest=new Map(reviews.filter(r=>r.visualReviewed&&r.accepted).map(r=>[r.id,r]));
for(const review of latest.values()){
 if(!review.visualReviewed||!review.accepted)continue;
 const input=path.join(root,review.master);
 const stats=await sharp(input).stats();const alpha=stats.channels[3];
 if(!alpha||alpha.min!==0||alpha.max<200)throw new Error('Missing real alpha: '+review.master);
 const asset=path.basename(input,'.png');const web='public/wildlife/assets/animals/'+asset+'.webp';
 const info=await sharp(input).resize({width:640,withoutEnlargement:true}).webp({quality:86,alphaQuality:100}).toFile(path.join(root,web));
 metadata[asset]={master:review.master,web,width:info.width,height:info.height,alpha:true,photoReference:review.photoReference,photoReviewed:true,visualReviewed:true,illustrationExpertReviewed:false,generation:'built-in image_gen',style:'user-requested loose cute gouache',reviewNote:review.note,sha256:crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex')};
 choices[review.id]=asset;
}
fs.writeFileSync(path.join(root,'data/illustrations.json'),JSON.stringify(metadata,null,2)+'\n');
fs.writeFileSync(path.join(root,'data/illustration-choices.json'),JSON.stringify(choices,null,2)+'\n');
console.log(JSON.stringify({adoptedChoices:Object.keys(choices).length}));
