-- Read-only safety audit for fuel station classification and duplicate candidates.
-- Never deduplicate source IDs: observations reference the original provider IDs.
SELECT s.chain,
 count(*) AS stations,
 count(*) FILTER (WHERE s.traffic_station_verified) AS verified,
 count(*) FILTER (WHERE NOT s.traffic_station_verified) AS pending
FROM public.ziiply_fuel_stations s
WHERE coalesce(s.chain,'') NOT ILIKE '%teboil%'
GROUP BY s.chain ORDER BY pending DESC;
SELECT c.source_station_id_a,c.source_station_id_b,c.review_status,c.evidence_note,
 a.name AS name_a,b.name AS name_b,
 a.address AS address_a,b.address AS address_b,
 (SELECT count(*) FROM public.ziiply_fuel_price_observations o
  WHERE o.source=c.source AND o.source_station_id::text=c.source_station_id_a) AS observations_a,
 (SELECT count(*) FROM public.ziiply_fuel_price_observations o
  WHERE o.source=c.source AND o.source_station_id::text=c.source_station_id_b) AS observations_b
FROM public.ziiply_fuel_station_identity_candidates c
JOIN public.ziiply_fuel_stations a ON a.source=c.source AND a.source_station_id::text=c.source_station_id_a
JOIN public.ziiply_fuel_stations b ON b.source=c.source AND b.source_station_id::text=c.source_station_id_b
ORDER BY c.distance_m;
