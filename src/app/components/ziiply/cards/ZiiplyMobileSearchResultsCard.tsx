export default function ZiiplyMobileSearchResultsCompact() {
  const results = [
    {
      id: 1,
      name: 'Maitokolmio Sipaisu Laktoositon rasvaseos 400g',
      unitPrice: '6,73 €/kg',
      price: '2,69 €',
      image:
        'https://images.s-kaupat.fi/products/6438200102878.jpg',
    },
    {
      id: 2,
      name: 'Kotimaista rasvaton maito 1l',
      unitPrice: '0,85 €/kg',
      price: '0,85 €',
      image:
        'https://images.s-kaupat.fi/products/6407210134507.jpg',
    },
    {
      id: 3,
      name: 'Kotimaista iskukuumennettu vähälaktoosinen rasvaton maito 1l',
      unitPrice: '1,85 €/kg',
      price: '1,85 €',
      image:
        'https://images.s-kaupat.fi/products/6407210134699.jpg',
    },
  ]

  return (
    <div className="min-h-screen bg-[#dce4e1] p-4">
      <div className="mx-auto max-w-[420px] rounded-[2rem] border-[5px] border-[#7b5726] bg-[#f5ecd0] p-4 shadow-[0_12px_0_rgba(91,72,44,0.22)]">
        <div className="mb-4 flex items-start justify-between border-b-[3px] border-[#b99657] pb-3">
          <div>
            <div className="text-[0.9rem] font-black uppercase tracking-[0.45em] text-[#7b6947]">
              Löydökset
            </div>

            <div className="mt-1 text-[2rem] font-black italic leading-none text-[#123d32]">
              Maito
            </div>
          </div>

          <button className="flex h-[4.2rem] w-[4.2rem] items-center justify-center rounded-full border-[4px] border-[#8c6934] bg-[#f9f0cf] text-[2rem] font-black text-[#5e4722] shadow-[0_4px_0_rgba(91,72,44,0.18)]">
            ×
          </button>
        </div>

        <div className="space-y-2">
          {results.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[4.6rem_minmax(0,1fr)_6.2rem] items-center gap-3 rounded-[1.45rem] border-[3px] border-[#8c6934] bg-[#fffdf8] px-3 py-2 shadow-[0_4px_0_rgba(91,72,44,0.12)]"
            >
              <div className="flex items-center justify-center">
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-[4.3rem] w-[4.3rem] object-contain"
                />
              </div>

              <div className="min-w-0">
                <div className="line-clamp-2 text-[0.96rem] font-black leading-[0.92] text-[#123d32]">
                  {item.name}
                </div>

                <div className="mt-1 flex items-center gap-2 text-[0.72rem] font-black text-[#7a6947]">
                  <span>{item.unitPrice}</span>

                  <span className="opacity-50">•</span>

                  <span className="text-[0.98rem] text-[#234b24]">
                    {item.price}
                  </span>
                </div>
              </div>

              <button className="rounded-[0.9rem] border-[2.5px] border-[#178338] bg-[#08a63d] px-3 py-3 text-[0.92rem] font-black uppercase text-[#fff6dc] shadow-[0_3px_0_rgba(0,74,24,0.22)] active:translate-y-[1px]">
                Lisää
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
