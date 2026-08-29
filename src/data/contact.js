/* Business contact details, lifted from the web Footer and FloatingWhatsApp.
   Single source now — the phone number appeared in five places there. */
export const CONTACT = {
  whatsappNumber: '8801629773885',
  phone: '+8801629773885',
  email: 'support@paicart.com',
  address: '26/1 Chamelibagh, Shantinagar, Dhaka 1217',
  hours: 'Available Sat – Thu · 9:00 AM – 7:00 PM',
  instagram: 'https://www.instagram.com/paicart.com.bd?igsh=MTBzdmQxNmNubDJ6Ng==',
};

export const whatsappUrl = (text) =>
  `https://wa.me/${CONTACT.whatsappNumber}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
