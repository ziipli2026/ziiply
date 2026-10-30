import SwiftUI
import Charts

private let healthCategories: [(String, String)] = [
    ("steps", "Askeleet"), ("active_energy", "Aktiivisuusenergia"),
    ("resting_heart_rate", "Leposyke"), ("hrv", "Sykevälivaihtelu (SDNN)"),
    ("sleep_stages", "Uni ja univaiheet")
]

struct ArvoConsent: Codable {
    let version: String
    let recordedAt: Date
    let categories: [String]
    let action: String
}

@MainActor final class ArvoHealthModel: ObservableObject {
    @Published var days: [[String: Any]] = []
    @Published var consent: ArvoConsent?
    @Published var busy = false
    @Published var status = "Yhteyttä ei ole avattu."
    @Published var updatedAt: Date?
    private let reader: any ArvoHealthReading
    private let recordConsent: ((ArvoConsent) throws -> Void)?
    init(reader: (any ArvoHealthReading)? = nil,
         recordConsent: ((ArvoConsent) throws -> Void)? = nil) {
        self.reader = reader ?? ArvoHealthKitReader()
        self.recordConsent = recordConsent
    }
    private(set) var task: Task<Void, Never>?
    private var generation = UUID()
    static let privacyVersion = "2026-10-30-local-v1"

    // Consent metadata only. Health readings never go into a file, browser or network.
    private func audit(_ record: ArvoConsent) throws {
        if let recordConsent { try recordConsent(record); return }
        let directory = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask,
                                                   appropriateFor: nil, create: true)
            .appendingPathComponent("ArvoConsent", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        var excluded = URLResourceValues(); excluded.isExcludedFromBackup = true
        var mutableDirectory = directory; try mutableDirectory.setResourceValues(excluded)
        let url = directory.appendingPathComponent(UUID().uuidString + ".json")
        try JSONEncoder().encode(record).write(to: url, options: [.atomic, .completeFileProtection])
    }

    func connect(categories: Set<String>, days count: Int) {
        guard !busy, !categories.isEmpty else { return }
        let record = ArvoConsent(version: Self.privacyVersion, recordedAt: Date(),
                                 categories: categories.sorted(), action: "grant")
        do { try audit(record) } catch { status = "Luvan kirjaaminen epäonnistui. Tietoja ei lueta."; return }
        consent = record
        busy = true
        let token = generation
        task = Task {
            do {
                try await reader.requestAccess(approved: categories)
                guard generation == token, !Task.isCancelled else { return }
                busy = false
                refresh(days: count)
            } catch {
                guard generation == token else { return }
                revoke()
                status = "Health-yhteyden avaaminen ei onnistunut. Tarkista Terveys-sovelluksen luvat."
            }
        }
    }

    func refresh(days count: Int) {
        guard consent != nil, !busy else { return }
        busy = true; days = []; updatedAt = nil
        let token = generation
        task = Task {
            do {
                var result: [[String: Any]] = []
                let today = Calendar.current.startOfDay(for: Date())
                for offset in (0..<min(30, max(1, count))).reversed() {
                    try Task.checkCancellation()
                    guard generation == token else { return }
                    let date = Calendar.current.date(byAdding: .day, value: -offset, to: today)!
                    result.append(try await reader.readDay(date))
                }
                guard generation == token, !Task.isCancelled else { return }
                days = result; updatedAt = Date(); busy = false
                status = "Luku valmis. Viiva tarkoittaa puuttuvaa tietoa tai puuttuvaa lukulupaa."
            } catch {
                guard generation == token else { return }
                busy = false; days = []; status = "Tietojen lukeminen ei onnistunut. Voit yrittää uudelleen."
            }
        }
    }

    func revoke() {
        let old = consent
        generation = UUID(); task?.cancel(); task = nil
        reader.revokeLocalConsent(); days = []; consent = nil; updatedAt = nil; busy = false
        status = "Lupa peruttu ja Arvon muistissa olevat terveystiedot tyhjennetty."
        if let old {
            do { try audit(ArvoConsent(version: old.version, recordedAt: Date(), categories: old.categories, action: "revoke")) }
            catch { status += " Peruutuksen lokikirjaus epäonnistui; lukeminen on silti estetty." }
        }
    }
}

struct ContentView: View {
    @StateObject private var model = ArvoHealthModel()
    @Environment(\.scenePhase) private var scenePhase
    @State private var categories = Set<String>()
    @State private var privacyRead = false
    @State private var explicitConsent = false
    @State private var count = 1
    @State private var metric = "steps"
    private let metrics: [(String, String, String, String)] = [
        ("steps", "Askeleet", "askelta", "steps"),
        ("activeEnergyKcal", "Aktiivisuusenergia", "kcal", "active_energy"),
        ("restingHeartRateBpm", "Leposyke", "/min", "resting_heart_rate"),
        ("hrvSdnnMs", "HRV SDNN", "ms", "hrv"),
        ("sleepMinutes", "Uni", "min", "sleep_stages"),
        ("remMinutes", "REM-uni", "min", "sleep_stages"),
        ("coreMinutes", "Kevyt uni", "min", "sleep_stages"),
        ("deepMinutes", "Syvä uni", "min", "sleep_stages"),
        ("awakeMinutes", "Valveilla", "min", "sleep_stages")
    ]
    private var allowedMetrics: [(String, String, String, String)] {
        metrics.filter { model.consent?.categories.contains($0.3) == true }
    }
    private var selectedMetric: String { allowedMetrics.contains(where: { $0.0 == metric }) ? metric : allowedMetrics.first?.0 ?? "steps" }
    private var points: [(date: String, value: Double)] {
        model.days.compactMap { day in
            guard let date = day["localDate"] as? String, let value = day[selectedMetric] as? NSNumber else { return nil }
            return (date, value.doubleValue)
        }
    }
    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("Terveys ja aktiivisuus").font(.title2.bold())
                    Text("Apple Healthin tiedot luetaan vain tällä iPhonella. Tietoja ei lähetetä Ziiplylle eikä selaimeen.")
                }
                if model.consent == nil {
                    Section("Valitse tietoryhmät") {
                        ForEach(healthCategories, id: \.0) { category in
                            Toggle(category.1, isOn: Binding(get: { categories.contains(category.0) }, set: {
                                if $0 { categories.insert(category.0) } else { categories.remove(category.0) }
                            }))
                        }
                    }
                    Section("Tietosuojatiedot · \(ArvoHealthModel.privacyVersion)") {
                        Text("Ziiply Oy · legal@ziiply.fi")
                        Text("Tarkoitus: valitsemiesi aktiivisuus- ja terveystietojen näyttäminen Arvon henkilökohtaisessa seurannassa. Käsittely perustuu nimenomaiseen suostumukseesi. Tietoja ei käytetä mainontaan tai markkinointiin.")
                        Text("Päiväyhteenvedot ovat vain sovelluksen työmuistissa. Ne poistetaan, kun perut luvan, sovellus siirtyy taustalle tai sulkeutuu. Ziiplyn palvelin, analytiikka ja muut vastaanottajat eivät saa niitä.")
                        Text("Lupatapahtuman aika, selosteen versio, valitut tietoryhmät ja peruutus tallennetaan suojattuun tiedostoon tällä laitteella. Lokia ei varmuuskopioida pilveen. Se poistuu sovelluksen poiston yhteydessä.")
                        Text("Yhteys on vapaaehtoinen. Luvan voi perua tästä näkymästä; Apple Healthin lukuluvat perutaan lisäksi Terveys-sovelluksessa. Arvo ei muuta eikä poista Apple Healthin alkuperäisiä tietoja. Voit pyytää tietosuojasta lisätietoja yllä olevasta osoitteesta ja tehdä kantelun tietosuojavaltuutetulle.")
                        Toggle("Olen lukenut tietosuojatiedot", isOn: $privacyRead)
                        Toggle("Annan nimenomaisen luvan valitsemieni terveystietojen käsittelyyn yllä kuvattuun tarkoitukseen", isOn: $explicitConsent)
                        Button("Hyväksy ja avaa Apple Healthin luvat") { model.connect(categories: categories, days: count) }
                            .disabled(!privacyRead || !explicitConsent || categories.isEmpty || model.busy)
                    }
                } else {
                    Section("Seuranta") {
                        Picker("Jakso", selection: $count) { Text("Päivä").tag(1); Text("7 päivää").tag(7); Text("30 päivää").tag(30) }.pickerStyle(.segmented).disabled(model.busy)
                        Picker("Mittari", selection: $metric) {
                            ForEach(allowedMetrics, id: \.0) { item in Text(item.1).tag(item.0) }
                        }
                        if points.isEmpty { Text("Ei luettavia tietoja. Tarkista tietoryhmän luvat Terveys-sovelluksesta. Puuttuvia arvoja ei tulkita nollaksi.") }
                        else {
                            Chart(points, id: \.date) { point in
                                BarMark(x: .value("Päivä", String(point.date.suffix(5))), y: .value("Arvo", point.value)).foregroundStyle(.green)
                            }.frame(height: 210)
                            Text("\(allowedMetrics.first(where: { $0.0 == selectedMetric })?.1 ?? "") · \(allowedMetrics.first(where: { $0.0 == selectedMetric })?.2 ?? "")").font(.caption)
                            ForEach(model.days.indices, id: \.self) { index in
                                let day = model.days[index]
                                LabeledContent(day["localDate"] as? String ?? "") {
                                    if let value = day[selectedMetric] as? NSNumber { Text(value.doubleValue, format: .number.precision(.fractionLength(0...1))) }
                                    else { Text("—") }
                                }
                            }
                        }
                        Button("Päivitä Apple Healthista") { model.refresh(days: count) }.disabled(model.busy)
                        Text("Askeleet ja energia ovat päiväkohtaisia summia; leposyke ja HRV päiväkeskiarvoja. Uni jaetaan keskiyöllä paikallisiin kalenteripäiviin. Aktiivisuusenergia ei tarkoita kokonaiskulutusta.").font(.caption)
                    }
                    Section("Lupa ja yhteyden tila") {
                        if let consent = model.consent {
                            Text("Suostumus kirjattu \(consent.recordedAt.formatted(date: .abbreviated, time: .shortened))")
                            Text("Versio: \(consent.version)").font(.caption)
                        }
                        if let date = model.updatedAt { Text("Viimeisin luku: \(date.formatted(date: .abbreviated, time: .shortened))") }
                        Button("Peru lupa ja tyhjennä tiedot", role: .destructive) { revoke() }
                        Text("Muuta Applen lukulupia Terveys-sovelluksen profiilin kohdasta Sovellukset → Ziiply Arvo. Apple ei kerro sovellukselle, estettiinkö luku vai puuttuuko tieto.").font(.caption)
                    }
                }
                Section { if model.busy { ProgressView("Luetaan valitut tietoryhmät…") }; Text(model.status).font(.footnote) }
            }
            .navigationTitle("Arvo")
            .onChange(of: count) { _ in model.refresh(days: count) }
            .onChange(of: scenePhase) { phase in if phase == .background { revoke() } }
        }
    }
    private func revoke() { model.revoke(); privacyRead = false; explicitConsent = false; categories = [] }
}
