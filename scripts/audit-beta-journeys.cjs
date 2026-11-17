#!/usr/bin/env node
// Read-only beta journey inventory: report evidence, never imply an unverified event exists.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/app/page.tsx'),'utf8');
const files=[
 'src/app/components/ziiply/cards/ZiiplyCartCard.tsx',
 'src/app/components/ziiply/cards/ZiiplyMobileCartCard.tsx',
 'src/app/components/ziiply/mobile/ZiiplyMobileCartView.tsx',
 'src/app/components/ziiply/justiina/JustiinaRecipeEditor.tsx',
 'src/app/components/ziiply/justiina/JustiinaOnlineRecipes.tsx',
 'src/app/components/ziiply/mobile/gostaWatchResults.ts',
 'src/app/components/ziiply/search/searchTelemetry.ts',
 'src/app/components/PostHogProvider.tsx',
 'src/app/api/analytics/search/route.ts',
];
const corpus=[{file:'src/app/page.tsx',text:source},...files.map(file=>({file,text:fs.readFileSync(path.join(root,file),'utf8')}))];
const journeys={
 cart:{keywords:/cart|kori|basket|product_added_to_cart|cart_item_added/i,events:['product_added_to_cart','cart_item_added']},
 comparison:{keywords:/compar|vertail|checkout|cart_comparison_completed/i,events:['cart_comparison_completed']},
 gosta_watch:{keywords:/gosta|watch|tarjousvahti|offer/i,events:['watch_saved','watch_results_opened','gosta_offer_search_clicked']},
 justiina_recipe:{keywords:/justiina|recipe|resepti/i,events:['recipe_items_added_to_list']},
 beta_identity:{keywords:/identify\s*\(|beta_login_succeeded|magic.link|session|auth/i,events:['beta_login_succeeded']},
};
const captureRe=/\b(?:posthog\.capture|trackZiiplyEvent|safeCapture)\s*\(\s*['"]([^'"]+)['"]/g;
const emitted=corpus.flatMap(({file,text})=>[...text.matchAll(captureRe)].map(m=>({event:m[1],file})));
const telemetry=corpus.find(x=>x.file.endsWith('/search/searchTelemetry.ts')).text;
const provider=corpus.find(x=>x.file.endsWith('/PostHogProvider.tsx')).text;
const server=corpus.find(x=>x.file.endsWith('/analytics/search/route.ts')).text;
const identityAudit={
 browserSdkInitialized:/posthog\.init\(/.test(provider),
 browserSdkDistinctIdForwarded:/posthog\.get_distinct_id\(\)/.test(telemetry)&&/posthog_distinct_id:\s*browserPosthogDistinctId\(\)/.test(telemetry),
 serverValidatesSdkDistinctId:/sdkDistinctId/.test(server)&&/distinct_id:\s*sdkDistinctId\s*\|\|/.test(server),
 fallbackSearchScopedIdentity:/ziiply-search-/.test(server),
 identityJoinImplementationPresent:false,
 runtimeIdentityJoinVerifiedByThisAudit:false,
 posthogDashboardGroupingVerified:false,
 note:'Static source audit only. Chromium smoke verifies UUID-shaped SDK ID in requests; dashboard identity grouping and cross-stream user funnels require separate verification.'
};
identityAudit.identityJoinImplementationPresent=identityAudit.browserSdkInitialized&&identityAudit.browserSdkDistinctIdForwarded&&identityAudit.serverValidatesSdkDistinctId;
const report={audit:'beta-journeys',scope:'selected source files; dynamic events and page.tsx indirect calls need runtime validation',identityAudit,journeys:Object.fromEntries(Object.entries(journeys).map(([name,config])=>[name,{
 sourceFiles:corpus.filter(x=>config.keywords.test(x.text)).map(x=>x.file),
 expectedEvents:config.events,
 literalEmitters:emitted.filter(x=>config.events.includes(x.event)),
 runtimeVerified:false
}])),privacy:{
 clientAutocaptureDisabled:/autocapture:\s*false/.test(corpus.find(x=>x.file.endsWith('PostHogProvider.tsx')).text),
 clientSessionRecordingDisabled:/disable_session_recording:\s*true/.test(corpus.find(x=>x.file.endsWith('PostHogProvider.tsx')).text),
 serverSearchTestMarkerPresent:/ziiply_internal_test/.test(corpus.find(x=>x.file.endsWith('/analytics/search/route.ts')).text),
 serverSearchEnvironmentPresent:/ziiply_environment/.test(corpus.find(x=>x.file.endsWith('/analytics/search/route.ts')).text),
 serverSearchAnonymousId:/anonymous_user_id/.test(corpus.find(x=>x.file.endsWith('/analytics/search/route.ts')).text)
}};
console.log(JSON.stringify(report,null,2));
if(!report.privacy.clientAutocaptureDisabled||!report.privacy.clientSessionRecordingDisabled||!report.privacy.serverSearchEnvironmentPresent)process.exitCode=1;
