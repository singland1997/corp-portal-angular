export const myCorporatesEn = {
  title: 'My corporates',
  mine: 'Corporates I look after',
  available: 'Corporates without a sales owner',
  availableHint:
    'Pick a corporate to start looking after it. Ask an admin to move one another sales user has.',
  search: 'Search corporates',
  claim: 'Look after',
  release: 'Stop looking after',
  keepOne: 'You need at least one corporate.',
  none: 'Every corporate already has a sales owner.',
  taken: 'Another sales user just took this corporate.',
  lastOne: 'Keep at least one corporate. Pick another one first.',
  failed: 'The change could not be saved. Try again.',
};

export const myCorporatesTh: Record<keyof typeof myCorporatesEn, string> = {
  title: 'องค์กรที่ดูแล',
  mine: 'องค์กรที่ฉันดูแล',
  available: 'องค์กรที่ยังไม่มี sales ดูแล',
  availableHint:
    'เลือกองค์กรเพื่อเริ่มดูแล ถ้าต้องการองค์กรที่ sales คนอื่นดูแลอยู่ ให้แจ้ง admin ย้ายให้',
  search: 'ค้นหาองค์กร',
  claim: 'ดูแลองค์กรนี้',
  release: 'เลิกดูแล',
  keepOne: 'ต้องดูแลอย่างน้อย 1 องค์กร',
  none: 'ทุกองค์กรมี sales ดูแลแล้ว',
  taken: 'มี sales คนอื่นเลือกองค์กรนี้ไปก่อนแล้ว',
  lastOne: 'ต้องดูแลอย่างน้อย 1 องค์กร เลือกองค์กรอื่นก่อน',
  failed: 'บันทึกไม่สำเร็จ ลองอีกครั้ง',
};
