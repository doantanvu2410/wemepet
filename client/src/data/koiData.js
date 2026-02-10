const varieties = ['Kohaku', 'Showa', 'Sanke', 'Tancho', 'Utsuri', 'Bekko', 'Asagi', 'Shusui', 'Koromo', 'Goshiki'];
const breeders = ['Dainichi', 'Isa', 'Marudo', 'Sakai', 'Momotaro', 'Omosako', 'Konishi'];

const koiData = Array.from({ length: 10 }, (_, i) => {
  const variety = varieties[Math.floor(Math.random() * varieties.length)];
  const breeder = breeders[Math.floor(Math.random() * breeders.length)];
  const year = 2018 + Math.floor(Math.random() * 6);
  const id = `WEMEPET-${String(i + 1).padStart(3, '0')}`;

  return {
    id,
    name: `${variety} ${breeder} #${Math.floor(Math.random() * 1000)}`,
    variety,
    breeder,
    dob: `${year}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-15`,
    gender: Math.random() > 0.5 ? 'Female' : 'Male',
    price: Math.floor(Math.random() * 5000) + 500,
    size: Math.floor(Math.random() * 60) + 20,
    status: Math.random() > 0.8 ? 'Consigned' : 'Available',
    certificate_img: 'https://via.placeholder.com/400x250?text=WEMEPET+Certificate',
    history: [
      { date: `${year + 1}-01`, size: 30, image: 'https://via.placeholder.com/200?text=Growth+Stage' },
    ],
    images: [
      `https://via.placeholder.com/400x300?text=${id}+Image+1`,
      `https://via.placeholder.com/400x300?text=${id}+Image+2`,
    ],
  };
});

export default koiData;
