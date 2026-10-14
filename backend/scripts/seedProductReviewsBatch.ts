/**
 * Seed ~110 unique approved guest reviews across active products.
 * Distribution: 0–4 per product (slug-hash stable), not 5–10 each.
 *
 * Idempotent: deletes guestEmail *@seed.gopeptides.reviews first.
 *
 * Local:  npx tsx scripts/seedProductReviewsBatch.ts
 * Prod:   cd /var/www/html/backend && npx tsx scripts/seedProductReviewsBatch.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SEED_DOMAIN = 'seed.gopeptides.reviews';
const TARGET = 110;

type Band = 'ultra' | 'short' | 'medium' | 'long';
type Frag = { en: string; nl: string; fr: string };

const NAMES = [
  'Lisa Bakker', 'Mark de Vries', 'Eva Jansen', 'Thomas Mulder', 'Noor Ahmed',
  'Joris Peeters', 'Anouk Smits', 'Sander V.', 'Priya N.', 'James H.',
  'Emily R.', 'Chris P.', 'Hannah K.', 'Daniel M.', 'Olivia S.',
  'Ryan T.', 'Camille D.', 'Julien M.', 'Sophie L.', 'Antoine B.',
  'Claire R.', 'Hugo P.', 'Marie G.', 'Lucas F.', 'Amira K.',
  'Ben Carter', 'Nina Volkov', 'Omar Farid', 'Greta Hoffmann', 'Paul Meijer',
  'Iris de Boer', 'Koen Willems', 'Fatima El', 'David Chen', 'Sara Novak',
  'Tom Hughes', 'Léa Martin', 'Finn Berg', 'Yara Said', 'Peter Novak',
  'Mila Petrov', 'Jonas Lind', 'Aisha Rahman', 'Erik Johansson', 'Chloe Park',
  'Ruben Costa', 'Ingrid Solberg', 'Hassan Ali', 'Nora Blanc', 'Vicente Ruiz',
  'Elena Popescu', 'Mateo Rossi', 'Kim Andersson', 'Lara Costa', 'Owen Blake',
  'Sofia Dimitri', 'Adam Nowak', 'Helena Costa', 'Marcus Lee', 'Zara Khan',
  'Felix Braun', 'Maya Patel', 'Stefan Novak', 'Lotte Visser', 'Ibrahim Yilmaz',
  'Carmen Silva', 'Niels Holm', 'Ava Bergstrom', 'Ravi Sharma', 'Julia Nowak',
  'Piotr Kowalski', 'Emma Berg', 'Tariq Hassan', 'Vera Novak', 'Samir Haddad',
  'Olivia Brown', 'Kai Nakamura', 'Diana Popa', 'Leo Fischer', 'Marta Zielinska',
  'Andre Sousa', 'Nadia Bel', 'Victor Chen', 'Helena Berg', 'Jonas Vermeer',
  'Esme Walsh', 'Rafael Santos', 'Ines Moreau', 'Tobias Klein', 'Yasmin Omar',
  'Giulia Romano', 'Henrik Dahl', 'Anya Petrov', 'Luca Moretti', 'Freya Olsen',
  'Marco Silva', 'Elise Dubois', 'Niklas Berg', 'Chiara Bianchi', 'Arjan de Jong',
  'Sven Eriksson', 'Monika Weiss', 'Diego Alvarez', 'Klara Hansen', 'Rosa Mendes',
  'Filip Kowalczyk', 'Agnes Laurent', 'Boris Ivanov', 'Celine Dupont', 'Marek Szymanski',
  'Isabelle Roux', 'Timo Schmidt', 'Nadia Kovač', 'Ewan MacLeod', 'Petra Horvat',
];

const SHORT_TITLES: Frag[] = [
  { en: 'OK', nl: 'OK', fr: 'OK' },
  { en: 'Fine', nl: 'Prima', fr: 'Bien' },
  { en: 'Good batch', nl: 'Goede batch', fr: 'Bon lot' },
  { en: 'Solid', nl: 'Stevig', fr: 'Solide' },
  { en: 'Works', nl: 'Werkt', fr: 'Ça marche' },
  { en: 'No drama', nl: 'Geen gedoe', fr: 'Sans souci' },
  { en: 'Fine vial', nl: 'Prima vial', fr: 'Flacon OK' },
  { en: 'All good', nl: 'Alles goed', fr: 'Tout bon' },
  { en: 'Reorder', nl: 'Opnieuw', fr: 'Recommander' },
  { en: '—', nl: '—', fr: '—' },
  { en: 'Yep', nl: 'Ja hoor', fr: 'Oui' },
  { en: 'Decent', nl: 'Degelijk', fr: 'Correct' },
];

const LONG_TITLES: Frag[] = [
  { en: 'Solid vial, clear label', nl: 'Stevige vial, duidelijk label', fr: 'Flacon solide, étiquette claire' },
  { en: 'Exactly what we ordered', nl: 'Precies wat we bestelden', fr: 'Exactement ce que nous avons commandé' },
  { en: 'CoA matched our batch notes', nl: 'CoA klopte met onze batchnotities', fr: 'CoA conforme à nos notes de lot' },
  { en: 'Quietly professional supplier', nl: 'Rustig professionele leverancier', fr: 'Fournisseur discret et pro' },
  { en: 'Would reorder this SKU', nl: 'Deze SKU bestel ik opnieuw', fr: 'Je rachèterai ce SKU' },
  { en: 'Discreet carton, intact seal', nl: 'Discrete doos, intacte zegel', fr: 'Carton discret, scellé intact' },
  { en: 'Support answered same day', nl: 'Support antwoordde dezelfde dag', fr: 'Support a répondu le jour même' },
  { en: 'Second order, same quality', nl: 'Tweede bestelling, zelfde kwaliteit', fr: '2e commande, même qualité' },
  { en: 'University lab friendly docs', nl: 'Handig voor university-lab docs', fr: 'Docs pratiques pour labo univ.' },
  { en: 'Happy we switched suppliers', nl: 'Blij dat we wisselden van leverancier', fr: 'Content d\'avoir changé de fournisseur' },
  { en: 'Nothing flashy — just correct', nl: 'Niet flashy — gewoon correct', fr: 'Rien de flashy — juste correct' },
  { en: 'Better than our last vendor', nl: 'Beter dan vorige vendor', fr: 'Mieux que le précédent vendeur' },
  { en: 'SOP-friendly paperwork', nl: 'SOP-vriendelijke papierwinkel', fr: 'Paperasse compatible SOP' },
  { en: 'Kept our timeline intact', nl: 'Hield onze planning heel', fr: 'Planning respecté' },
  { en: 'Honest purity claim vibe', nl: 'Zuiverheidsclaim voelt eerlijk', fr: 'Claim de pureté crédible' },
];

// Ultra-short bodies (3–8 words)
const ULTRA: Frag[] = [
  { en: 'Solid vial. Reorder soon.', nl: 'Stevige vial. Binnenkort opnieuw.', fr: 'Flacon solide. Je recommande.' },
  { en: 'Good batch, no complaints.', nl: 'Goede batch, geen klachten.', fr: 'Bon lot, rien à redire.' },
  { en: 'Fast ship. Seal intact.', nl: 'Snelle levering. Zegel intact.', fr: 'Livraison rapide. Scellé OK.' },
  { en: 'Exactly what we needed.', nl: 'Precies wat we nodig hadden.', fr: 'Exactement ce qu\'il fallait.' },
  { en: 'Clean label. Happy lab.', nl: 'Schoon label. Tevreden lab.', fr: 'Étiquette nette. Labo content.' },
  { en: 'No drama. Five stars.', nl: 'Geen gedoe. Vijf sterren.', fr: 'Pas de souci. Cinq étoiles.' },
  { en: 'CoA matched. All good.', nl: 'CoA klopte. Alles goed.', fr: 'CoA OK. Tout bon.' },
  { en: 'Reorder without thinking twice.', nl: 'Opnieuw zonder twijfel.', fr: 'Recommander sans hésiter.' },
  { en: 'Vial fine. Docs clear.', nl: 'Vial prima. Docs helder.', fr: 'Flacon bien. Docs clairs.' },
  { en: 'Quiet packaging. Loud quality.', nl: 'Stille verpakking. Sterke kwaliteit.', fr: 'Emballage discret. Qualité nette.' },
  { en: 'Bench approved. Moving on.', nl: 'Bench akkoord. Door.', fr: 'Paillasse OK. On avance.' },
  { en: 'Tracking honest. Product fine.', nl: 'Tracking eerlijk. Product prima.', fr: 'Suivi honnête. Produit OK.' },
  { en: 'Cold pack still cool.', nl: 'Koude pack nog koel.', fr: 'Pack froid encore frais.' },
  { en: 'Cap tight. No leaks.', nl: 'Dop strak. Geen lekkage.', fr: 'Bouchon serré. Pas de fuite.' },
  { en: 'Works for our assays.', nl: 'Werkt voor onze assays.', fr: 'Convient à nos essais.' },
  { en: 'Second buy. Same result.', nl: 'Tweede koop. Zelfde resultaat.', fr: '2e achat. Même résultat.' },
  { en: 'Plain box. Good vial.', nl: 'Plain doos. Goede vial.', fr: 'Carton simple. Bon flacon.' },
  { en: 'Support replied fast.', nl: 'Support antwoordde snel.', fr: 'Support a répondu vite.' },
  { en: 'Label readable. Dosage clear.', nl: 'Label leesbaar. Dosering duidelijk.', fr: 'Étiquette lisible. Dosage clair.' },
  { en: 'Fine for routine work.', nl: 'Prima voor routine werk.', fr: 'Bien pour le routine.' },
  { en: 'No floaters after mix.', nl: 'Geen floaters na mix.', fr: 'Pas de particules après mix.' },
  { en: 'Arrived before forecast.', nl: 'Eerder dan forecast.', fr: 'Arrivé avant prévision.' },
  { en: 'Invoice matched vial.', nl: 'Factuur klopte met vial.', fr: 'Facture = flacon.' },
  { en: 'PI asked. We got it.', nl: 'PI vroeg. We hebben het.', fr: 'PI a demandé. Reçu.' },
  { en: 'Boring reliability. Love it.', nl: 'Saai betrouwbaar. Fijn.', fr: 'Fiabilité ennuyeuse. Parfait.' },
];

// One short sentence
const ONE_SENTENCE: Frag[] = [
  { en: 'The vial arrived sealed and the label matched our order sheet.', nl: 'De vial kwam verzegeld en het label klopte met ons orderformulier.', fr: 'Le flacon est arrivé scellé et l\'étiquette correspondait à notre bon.' },
  { en: 'Reconstitution was straightforward and we had no visible particulates.', nl: 'Reconstitutie ging simpel en we zagen geen zichtbare deeltjes.', fr: 'La reconstitution était simple, sans particules visibles.' },
  { en: 'Support answered our fridge question in one short email the same afternoon.', nl: 'Support beantwoordde onze koelkastvraag diezelfde middag in één korte mail.', fr: 'Le support a répondu sur le frigo le même après-midi en un mail court.' },
  { en: 'Carton was discreet and the foam insert kept the glass from rattling.', nl: 'Doos was discreet en het schuim hield het glas stil.', fr: 'Carton discret et la mousse a évité tout bruit du verre.' },
  { en: 'CoA fields were easy to copy into our batch log without guessing.', nl: 'CoA-velden waren makkelijk over te nemen in ons batchlog.', fr: 'Les champs CoA se copiaient facilement dans notre journal de lot.' },
  { en: 'Transit took a day longer than hoped but the product itself was fine.', nl: 'Transit duurde een dag langer dan gehoopt maar het product was prima.', fr: 'Transit un jour de plus qu\'espéré, mais le produit était bon.' },
  { en: 'We compared two vendors and this lot handled more predictably on the bench.', nl: 'We vergeleken twee vendors en dit lot gedroeg zich voorspelbaarder op de bench.', fr: 'Comparé à deux vendeurs, ce lot était plus prévisible à la paillasse.' },
  { en: 'Checkout was simple and the confirmation email listed the right SKU.', nl: 'Afrekenen was simpel en de bevestigingsmail noemde de juiste SKU.', fr: 'Paiement simple et l\'e-mail de confirmation listait le bon SKU.' },
  { en: 'Batch code on the sticker matched the PDF we downloaded from the site.', nl: 'Batchcode op de sticker klopte met de PDF van de site.', fr: 'Le code lot sur l\'autocollant correspondait au PDF du site.' },
  { en: 'Our lab tech logged it same day and noted no sticky residue around the stopper.', nl: 'Onze lab tech logde het dezelfde dag en zag geen plakkerig residu bij de stopper.', fr: 'Notre tech l\'a inventorié le jour même, sans résidu collant au bouchon.' },
  { en: 'Looks like a shop that ships research peptides every week, not a side hustle.', nl: 'Voelt als een shop die wekelijks research peptides verstuurt, geen bijbaan.', fr: 'On dirait une boutique qui expédie des peptides research chaque semaine.' },
  { en: 'Nothing cracked, nothing damp, and the cold elements were still cool at open.', nl: 'Niets gebarsten, niets vochtig, koude elementen nog koel bij openen.', fr: 'Rien de fissuré, pas d\'humidité, éléments froids encore frais à l\'ouverture.' },
  { en: 'I would buy again without hesitating if our stock runs low mid-quarter.', nl: 'Ik zou zonder aarzelen opnieuw kopen als voorraad halverwege het kwartaal op raakt.', fr: 'Je rachèterais sans hésiter si le stock baisse mi-trimestre.' },
  { en: 'Docs saved us an audit hour because we did not have to chase missing fields.', nl: 'Docs scheelden een audit-uur omdat we geen missende velden hoefden na te jagen.', fr: 'Les docs nous ont fait gagner une heure d\'audit, sans champs manquants.' },
  { en: 'Minor scuff on outer cardboard only — the vial itself was untouched.', nl: 'Alleen lichte kras op buitenkarton — de vial zelf onaangetast.', fr: 'Légère éraflure sur le carton extérieur — flacon intact.' },
  { en: 'Purity claim felt aligned with how it behaved during our prep steps.', nl: 'Zuiverheidsclaim voelde in lijn met gedrag tijdens onze prep-stappen.', fr: 'La claim de pureté collait au comportement lors de nos étapes de prep.' },
  { en: 'No marketing flyer junk in the box, which we appreciate for lab receiving.', nl: 'Geen marketingfolders in de doos, fijn voor lab-ontvangst.', fr: 'Pas de flyers marketing dans le carton, apprécié à la réception labo.' },
  { en: 'Colleagues on the neighboring bench asked for the link after seeing the CoA.', nl: 'Collega\'s op de naastgelegen bench vroegen om de link na de CoA.', fr: 'Des collègues à la paillasse voisine ont demandé le lien après le CoA.' },
  { en: 'Cap torque felt right when we opened under our usual SOP gloves.', nl: 'Dop zat stevig genoeg toen we openden met onze gebruikelijke SOP-handschoenen.', fr: 'Couple du bouchon correct à l\'ouverture sous nos gants SOP habituels.' },
  { en: 'Weight on the label matched the cart line and the invoice one-to-one.', nl: 'Gewicht op label klopte 1-op-1 met cartregel en factuur.', fr: 'Poids sur l\'étiquette = ligne panier et facture, un pour un.' },
  { en: 'Email subjects are a bit generic but the substance of the replies was concrete.', nl: 'Mailonderwerpen wat generiek maar inhoud van antwoorden was concreet.', fr: 'Objets d\'e-mail un peu génériques mais réponses concrètes.' },
  { en: 'Stable after overnight fridge storage exactly as the product page suggested.', nl: 'Stabiel na nacht in koelkast zoals de productpagina suggereerde.', fr: 'Stable après une nuit au frigo comme indiqué sur la fiche produit.' },
  { en: 'Feels like research-use material handled with the paperwork we expected.', nl: 'Voelt als research-use materiaal met de papierwinkel die we verwachtten.', fr: 'Matériel research-use avec la paperasse attendue.' },
  { en: 'One less supplier headache this month and we are back on schedule.', nl: 'Eén leverancierskopzorg minder deze maand en we liggen weer op schema.', fr: 'Un souci fournisseur en moins ce mois-ci, on est remis dans les temps.' },
  { en: 'Not flashy, just correct — which is honestly what we wanted.', nl: 'Niet flashy, gewoon correct — precies wat we wilden.', fr: 'Pas flashy, juste correct — c\'est ce qu\'on voulait.' },
  { en: 'Good enough that I bothered to write this review after a long lab day.', nl: 'Goed genoeg dat ik deze review schreef na een lange labdag.', fr: 'Assez bien pour que j\'écrive cet avis après une longue journée labo.' },
  { en: 'Shipping was acceptable for a cross-border parcel to our institute reception.', nl: 'Shipping acceptabel voor een grensoverschrijdend pakket naar onze receptie.', fr: 'Livraison acceptable pour un colis transfrontalier à notre réception.' },
  { en: 'We keep a spare vial in rotation now after the first quiet experience.', nl: 'We houden nu een spare vial in rotatie na de eerste rustige ervaring.', fr: 'On garde un flacon spare en rotation après la première expérience calme.' },
  { en: 'Batch string was readable without a magnifier on a busy afternoon.', nl: 'Batchstring leesbaar zonder loep op een drukke middag.', fr: 'Chaîne de lot lisible sans loupe un après-midi chargé.' },
  { en: 'No upsell spam after purchase, which is rare and appreciated.', nl: 'Geen upsell-spam na aankoop, zeldzaam en fijn.', fr: 'Pas de spam upsell après achat, rare et apprécié.' },
  { en: 'Outer box did not scream contents on the shipping label.', nl: 'Buitendoos schreeuwde niet wat erin zat op het verzendlabel.', fr: 'Carton extérieur discret sur l\'étiquette d\'expédition.' },
  { en: 'Glad we did not cheap out elsewhere when the timeline was tight.', nl: 'Blij dat we niet elders goedkoop gingen met een strakke planning.', fr: 'Content de ne pas avoir bradé ailleurs avec un planning serré.' },
  { en: 'Treat it as research-use only — we do and the framing on site is clear.', nl: 'Alleen research-use — wij ook en het kader op de site is duidelijk.', fr: 'Usage research uniquement — c\'est notre cadre aussi, clair sur le site.' },
  { en: 'Night order got a morning update, which helped our receiving desk.', nl: 'Nachtbestelling kreeg ochtendupdate, handig voor onze ontvangstbalie.', fr: 'Commande nocturne, update le matin — utile à notre réception.' },
  { en: 'Compared well to our last lot from a flaky vendor we dropped.', nl: 'Vergelijkbaar met ons vorige lot van een wisselvallige vendor die we lieten.', fr: 'Comparable au lot précédent d\'un vendeur irrégulier qu\'on a quitté.' },
  { en: 'Invoice line items matched the vials one-to-one without a reconciliation call.', nl: 'Factuurregels klopten 1-op-1 met vials zonder reconciliatiegesprek.', fr: 'Lignes facture = flacons 1:1 sans appel de réconciliation.' },
  { en: 'Foam held the vial tight; no rattle when the courier handed it over.', nl: 'Schuim hield vial strak; geen geratel toen koerier het overgaf.', fr: 'Mousse serrée ; pas de bruit quand le livreur a remis le colis.' },
  { en: 'Recommended to a neighboring group already and they ordered the same SKU.', nl: 'Al aangeraden aan buurgroep en zij bestelden dezelfde SKU.', fr: 'Déjà recommandé au groupe voisin — ils ont commandé le même SKU.' },
  { en: 'Slight delay but nothing that broke our demo timeline.', nl: 'Lichte vertraging maar niets dat onze demo-planning brak.', fr: 'Léger retard mais rien qui ait cassé notre calendrier de démo.' },
];

// Two–three sentences (medium)
const MEDIUM_A: Frag[] = [
  { en: 'We ordered for a short validation run.', nl: 'We bestelden voor een korte validatie.', fr: 'Nous avons commandé pour une courte validation.' },
  { en: 'Picked this up after a colleague recommended the shop.', nl: 'Gekocht na tip van een collega over de shop.', fr: 'Pris après conseil d\'un collègue sur la boutique.' },
  { en: 'Needed stock mid-week and did not want a gamble.', nl: 'Voorraad midden in de week nodig — geen gok.', fr: 'Besoin de stock en milieu de semaine, sans risque.' },
  { en: 'Restocked for our bench protocol this quarter.', nl: 'Bijgevuld voor ons bench-protocol dit kwartaal.', fr: 'Réapprovisionné pour notre protocole ce trimestre.' },
  { en: 'Tried it as a replacement for a flaky vendor.', nl: 'Geprobeerd als vervanging voor wisselvallige vendor.', fr: 'Testé pour remplacer un vendeur irrégulier.' },
  { en: 'Our PI asked specifically for this SKU.', nl: 'Onze PI vroeg specifiek om deze SKU.', fr: 'Notre PI a demandé précisément ce SKU.' },
  { en: 'First time ordering from this shop.', nl: 'Eerste keer bestellen bij deze shop.', fr: 'Première commande dans cette boutique.' },
  { en: 'Came back after a quiet first order.', nl: 'Teruggekomen na een rustige eerste order.', fr: 'Revenu après une première commande calme.' },
  { en: 'Small order to stress-test shipping.', nl: 'Kleine order om shipping te testen.', fr: 'Petite commande pour tester l\'expédition.' },
  { en: 'Added to our standing research shopping list.', nl: 'Op vaste research-inkooplijst gezet.', fr: 'Ajouté à la liste d\'achats research.' },
  { en: 'Used it the same week it arrived.', nl: 'Dezelfde week nog gebruikt.', fr: 'Utilisé la semaine de réception.' },
  { en: 'Reordered after the last vial finished.', nl: 'Opnieuw besteld toen vorige vial op was.', fr: 'Recommandé après le dernier flacon.' },
  { en: 'Chose it because the SKU naming is clear.', nl: 'Gekozen omdat SKU-naam helder is.', fr: 'Choisi pour le naming SKU clair.' },
  { en: 'Opened under our usual SOP.', nl: 'Geopend volgens onze gebruikelijke SOP.', fr: 'Ouvert selon notre SOP habituelle.' },
  { en: 'Logged into inventory same day.', nl: 'Dezelfde dag in inventaris gezet.', fr: 'Inventorié le jour même.' },
  { en: 'Lab tech suggested it for the next series.', nl: 'Lab tech stelde het voor voor volgende serie.', fr: 'Le tech l\'a suggéré pour la série suivante.' },
  { en: 'Split a budget line this quarter.', nl: 'Budgetregel dit kwartaal gebruikt.', fr: 'Budget alloué ce trimestre.' },
  { en: 'Compared two quotes and stayed here.', nl: 'Twee quotes vergeleken en hier gebleven.', fr: 'Comparé deux devis, resté ici.' },
  { en: 'Bought after reading the lab-results page.', nl: 'Gekocht na lab-results pagina.', fr: 'Acheté après la page lab-results.' },
  { en: 'Switched our source this month.', nl: 'Deze maand van bron gewisseld.', fr: 'Changé de source ce mois-ci.' },
];

const MEDIUM_B: Frag[] = [
  { en: 'Carton was plain and the seal looked untouched.', nl: 'Doos plain en zegel leek onaangeraakt.', fr: 'Carton discret et scellé intact.' },
  { en: 'CoA data filed easily next to our batch log.', nl: 'CoA-data makkelijk bij batchlog gearchiveerd.', fr: 'CoA facile à classer avec le journal de lot.' },
  { en: 'Label text was not smudged and dosage matched.', nl: 'Labeltekst niet vlekkerig; dosering klopte.', fr: 'Étiquette nette ; dosage correct.' },
  { en: 'Reconstitution looked clean with no floaters.', nl: 'Reconstitutie schoon — geen floaters.', fr: 'Reconstitution propre — pas de particules.' },
  { en: 'Tracking updates were boring in a good way.', nl: 'Tracking saai — op goede manier.', fr: 'Suivi ennuyeux, au bon sens.' },
  { en: 'Batch on label matched the PDF notes.', nl: 'Batch op label = PDF-notities.', fr: 'Lot étiquette = notes PDF.' },
  { en: 'Stopper sat flush with nothing sticky.', nl: 'Stopper vlak; niets plakkerigs.', fr: 'Bouchon bien assis ; rien de collant.' },
  { en: 'Cold elements still cool when we opened.', nl: 'Koude elementen nog koel bij openen.', fr: 'Éléments froids encore frais.' },
  { en: 'Invoice matched the vials without guessing.', nl: 'Factuur klopte zonder gokken.', fr: 'Facture correcte sans approximation.' },
  { en: 'Handled like research material — as wanted.', nl: 'Behandeld als researchmateriaal — gewenst.', fr: 'Traité comme matériel research — voulu.' },
  { en: 'Nothing cracked, leaking, or damp inside.', nl: 'Niets gebarsten, lekkend of vochtig.', fr: 'Rien fissuré, qui fuit ou humide.' },
  { en: 'Colleague checked CoA before we logged in.', nl: 'Collega checkte CoA vóór inloggen.', fr: 'Collègue a vérifié le CoA avant inventaire.' },
  { en: 'Time from ship notice to door was fine.', nl: 'Tijd ship-notice tot deur was oké.', fr: 'Délai avis expédition → porte OK.' },
  { en: 'Looks consistent with photos on the site.', nl: 'Komt overeen met foto\'s op site.', fr: 'Conforme aux photos du site.' },
  { en: 'Outer box stayed discreet on the label.', nl: 'Buitendoos bleef discreet op label.', fr: 'Carton extérieur discret sur l\'étiquette.' },
  { en: 'Reply about storage temp was concrete.', nl: 'Antwoord opslagtemp was concreet.', fr: 'Réponse température concrète.' },
  { en: 'Felt like weekly peptide shipping, not random.', nl: 'Voelde als wekelijkse peptide-shipping.', fr: 'Expédition peptides hebdo, pas aléatoire.' },
  { en: 'Cap did not fight us under SOP gloves.', nl: 'Dop gaf geen strijd onder SOP-handschoenen.', fr: 'Bouchon OK sous gants SOP.' },
  { en: 'Shelf placement obvious from label layout.', nl: 'Schappositie duidelijk via label.', fr: 'Rangement évident via l\'étiquette.' },
  { en: 'No wrong-language stickers on the vial.', nl: 'Geen verkeerde taalstickers op vial.', fr: 'Pas d\'autocollants mauvaise langue.' },
];

const MEDIUM_C: Frag[] = [
  { en: 'Will reorder when stock runs low.', nl: 'Opnieuw bestellen als voorraad laag is.', fr: 'Je rachète quand le stock baisse.' },
  { en: 'On our shortlist for the next PO.', nl: 'Op shortlist voor volgende PO.', fr: 'Sur la shortlist du prochain PO.' },
  { en: 'Solid experience start to finish.', nl: 'Solide ervaring van begin tot eind.', fr: 'Expérience solide du début à la fin.' },
  { en: 'Four stars only because transit was slow.', nl: 'Vier sterren alleen door trage transit.', fr: '4 étoiles : transit lent.' },
  { en: 'Five stars for boring reliability.', nl: 'Vijf sterren voor saaie betrouwbaarheid.', fr: '5 étoiles pour fiabilité ennuyeuse.' },
  { en: 'Thanks for not making this complicated.', nl: 'Dank dat het niet ingewikkeld werd.', fr: 'Merci de ne pas avoir compliqué.' },
  { en: 'Expect another order from us soon.', nl: 'Verwacht binnenkort nog een order.', fr: 'Attendez une autre commande bientôt.' },
  { en: 'Quiet win for the lab calendar.', nl: 'Rustige win voor labkalender.', fr: 'Petite victoire pour le calendrier labo.' },
  { en: 'Otherwise nothing to complain about.', nl: 'Verder niets om over te klagen.', fr: 'Sinon rien à redire.' },
  { en: 'We\'ll use the same SKU next cycle.', nl: 'Volgende cyclus dezelfde SKU.', fr: 'Même SKU au prochain cycle.' },
  { en: 'Happy enough to tell the rest of the bench.', nl: 'Tevreden genoeg voor de rest van bench.', fr: 'Assez content pour l\'équipe paillasse.' },
  { en: 'No drama — which is rare.', nl: 'Geen drama — zeldzaam.', fr: 'Pas de drama — rare.' },
  { en: 'Docs made paperwork less painful.', nl: 'Docs maakten papierwerk minder pijnlijk.', fr: 'Docs : paperasse moins pénible.' },
  { en: 'Keeping the supplier bookmarked.', nl: 'Leverancier blijft gebookmarkt.', fr: 'Fournisseur en favori.' },
  { en: 'I\'m filing this under "just works".', nl: 'Dit gaat onder "gewoon werkt".', fr: 'Je classe ça sous « ça marche ».' },
  { en: 'Would buy again without hesitating.', nl: 'Zonder aarzelen opnieuw kopen.', fr: 'Rachèterais sans hésiter.' },
  { en: 'Not flashy. Correct. That\'s the point.', nl: 'Niet flashy. Correct. Dat is het.', fr: 'Pas flashy. Correct. C\'est le but.' },
  { en: 'Puts us back on schedule.', nl: 'Zet ons weer op schema.', fr: 'On est remis dans les temps.' },
  { en: 'Three stars — product fine, site checkout clunky.', nl: 'Drie sterren — product oké, checkout wat houterig.', fr: '3 étoiles — produit OK, paiement un peu lourd.' },
  { en: 'Three stars for a day-late parcel only.', nl: 'Drie sterren alleen voor dag te laat pakket.', fr: '3 étoiles : colis un jour en retard seulement.' },
];

// Long paragraphs (5–6 sentences)
const LONG: Frag[] = [
  {
    en: 'We ordered for a controlled in-vitro setup after our previous vendor missed a batch note. Carton was discreet, cold pack still cool, and the vial seal looked untouched when we logged it. CoA fields copied cleanly into our lab book without guessing batch strings. Reconstitution was boring in the best way — no floaters, no odd smell, cap torque felt normal under gloves. Support answered a fridge question same day with a concrete temp range, not vague marketing. Will reorder when this vial runs low and we already told the neighboring bench group.',
    nl: 'Besteld voor gecontroleerde in-vitro opzet nadat vorige vendor een batchnote miste. Doos discreet, koude pack nog koel, vialzegel onaangeraakt bij inloggen. CoA-velden netjes in labboek zonder gokken. Reconstitutie saai op beste manier — geen floaters, geen rare geur, dop normaal onder handschoenen. Support beantwoordde koelkastvraag dezelfde dag met concrete temp, geen vage marketing. Bestellen opnieuw als vial laag is; buurbench al ingelicht.',
    fr: 'Commandé pour un setup in vitro contrôlé après qu\'un vendeur ait manqué une note de lot. Carton discret, pack froid encore frais, scellé intact à l\'inventaire. Champs CoA copiés proprement sans deviner. Reconstitution ennuyeuse au bon sens — pas de particules, pas d\'odeur bizarre, bouchon normal sous gants. Support a répondu sur le frigo le jour même avec une plage concrète. Je rachète quand le flacon baisse ; le groupe voisin est déjà au courant.',
  },
  {
    en: 'First time buying from GoPeptides after a colleague sent the lab-results link. Checkout was simple, confirmation email listed the right SKU, and tracking updates were honest even when customs slowed things by a day. Label dosage matched the cart, batch code readable without a magnifier, and the PDF CoA aligned with our internal spreadsheet. We opened under SOP, noted no sticky residue, and stored overnight in the fridge as advised. Four stars only because transit was a day slower than the forecast — the vial itself was fine. Already on our shortlist for the next PO.',
    nl: 'Eerste keer GoPeptides na collega die lab-results link stuurde. Checkout simpel, bevestiging noemde juiste SKU, tracking eerlijk ook toen douane een dag vertraagde. Labeldosering = cart, batchcode leesbaar, PDF CoA klopte met spreadsheet. Geopend onder SOP, geen plakkerig residu, nacht in koelkast zoals geadviseerd. Vier sterren alleen door dag trager dan forecast — vial zelf prima. Al op shortlist voor volgende PO.',
    fr: 'Première commande GoPeptides après le lien lab-results d\'un collègue. Paiement simple, confirmation avec bon SKU, suivi honnête même avec douane +1 jour. Dosage étiquette = panier, lot lisible, CoA PDF aligné avec notre tableur. Ouvert sous SOP, pas de résidu collant, nuit au frigo comme conseillé. 4 étoiles : transit un jour plus lent — flacon OK. Déjà sur la shortlist du prochain PO.',
  },
  {
    en: 'Our PI asked for a clean lot with documentation we could file without a chase email. This arrived plain-boxed, foam insert tight, no rattling glass when the courier dropped it at institute reception. Invoice line items matched vials one-to-one and the research-use framing on the site matched how we treat the material. Lab tech reconstituted same week, saw no cloudy bits, and logged purity notes beside the batch ID. I am not saying it is perfect science — we treat everything as research-use — but supplier behavior felt professional. Expect another order before quarter end.',
    nl: 'PI vroeg schone lot met docs zonder chase-mail. Plain-boxed gearriveerd, schuim strak, geen rattelend glas bij receptie. Factuurregels 1-op-1, research-use kader op site = ons gebruik. Lab tech reconstitueerdezelfde week, geen troebel, pureteit naast batch-ID gelogd. Geen perfecte wetenschap — alles research-use — maar leverancier voelde professioneel. Nog een order voor kwartaaleinde verwacht.',
    fr: 'Notre PI voulait un lot propre avec docs classables sans relance. Arrivé carton simple, mousse serrée, pas de verre qui claque à la réception. Facture 1:1, cadre research-use = notre usage. Tech a reconstitué la même semaine, pas de trouble, pureté notée à côté du lot. Pas de science parfaite — tout en research-use — mais fournisseur pro. Autre commande avant fin de trimestre.',
  },
  {
    en: 'Restocked mid-quarter when budget line opened up. Compared two quotes; stuck here because SKU naming and CoA layout were easier for admin. Outer cardboard had a scuff but vial was untouched, stopper flush, nothing leaking. Emails confirmed payment without us chasing and nobody spammed upsell links after purchase. Colleagues asked for the shop URL after seeing the label fonts — actually readable, which sounds silly until you have squint at bad prints. Solid experience overall. Keeping bookmarked for rotation.',
    nl: 'Bijgevuld midden kwartaal toen budgetregel opende. Twee quotes; hier gebleven door SKU-naam en CoA-layout voor admin. Buitenkarton gekrast maar vial oké, stopper vlak, geen lekkage. Mails bevestigden betaling zonder jagen, geen upsell-spam. Collega\'s vroegen URL na labelfonts — echt leesbaar. Solide ervaring. Gebookmarkt voor rotatie.',
    fr: 'Réappro mi-trimestre quand budget ouvert. Deux devis ; resté ici pour naming SKU et CoA admin. Carton éraflé mais flacon intact, bouchon OK, pas de fuite. E-mails paiement sans relance, pas de spam upsell. Collègues ont demandé l\'URL après les polices lisibles. Expérience solide. En favori pour rotation.',
  },
  {
    en: 'Small stress-test order before we moved a bigger PO. Arrived before forecast, cold elements still cool, batch string matched site PDF. Reconstitution straightforward; bench lead noted behavior consistent with prior lot from a vendor we dropped. Support reply about storage was short and concrete — fridge not freezer — which saved a back-and-forth. Three stars only because checkout felt slightly clunky on mobile; product and docs were fine. Would still reorder for routine assays.',
    nl: 'Kleine stresstest vóór grotere PO. Eerder dan forecast, koude elementen koel, batch = site-PDF. Reconstitutie simpel; bench lead zag gedrag consistent met oud lot van vendor die we lieten. Support opslag kort en concreet — koelkast geen vriezer. Drie sterren alleen door houterige mobile checkout; product en docs prima. Toch opnieuw voor routine assays.',
    fr: 'Petit test avant gros PO. Avant prévision, froid OK, lot = PDF site. Reconstitution simple ; lead a vu comportement cohérent vs ancien vendeur. Support stockage court — frigo pas congélateur. 3 étoiles : checkout mobile un peu lourd ; produit et docs OK. Je rachète pour essais routine.',
  },
  {
    en: 'Night order with morning ship notice helped our receiving desk plan intake. Vial looked like product page photos — no mystery powder smell, cap did not fight SOP opening. CoA saved an audit hour because fields were complete. We split a cart with another SKU; both lines arrived in one parcel with sane packing. Not flashy, just correct, which is what a small lab wants when timelines slip. Neighboring group already copied the link.',
    nl: 'Nachtorder met ochtend ship-notice hielp ontvangstbalie. Vial zoals productfoto\'s — geen rare geur, dop oké onder SOP. CoA scheelde audit-uur door complete velden. Cart met andere SKU; beide regels één pakket, nette packing. Niet flashy, correct — wat klein lab wil bij slip planning. Buurgroep kopieerde link al.',
    fr: 'Commande nocturne, avis expédition le matin — utile réception. Flacon comme photos — pas d\'odeur bizarre, bouchon OK sous SOP. CoA : une heure d\'audit gagnée. Panier avec autre SKU ; une colis, emballage propre. Pas flashy, correct — ce qu\'un petit labo veut. Groupe voisin a copié le lien.',
  },
  {
    en: 'Grabbed alongside another peptide in same cart for a demo series. Both vials sealed, labels not smudged, weights matched invoice. Tracking was boring in a good way until the last mile slowed one day — product still fine. Opened under usual gloves, logged same day, fridge overnight stable. Purity claim felt honest relative to handling, not hype. Four stars for transit wobble only. On rotation for next cycle.',
    nl: 'Meegenomen met andere peptide in zelfde cart voor demo-serie. Beide vials verzegeld, labels niet vlekkerig, gewichten = factuur. Tracking saai tot last mile een dag vertraagde — product oké. Geopend met handschoenen, zelfde dag gelogd, nacht koelkast stabiel. Zuiverheidsclaim eerlijk vs hype. Vier sterren alleen transit-wobble. Op rotatie volgende cyclus.',
    fr: 'Pris avec autre peptide même panier pour démo. Deux flacons scellés, étiquettes nettes, poids = facture. Suivi ennuyeux jusqu\'au dernier km +1 jour — produit OK. Ouvert sous gants, inventorié jour même, frigo stable. Claim pureté honnête vs hype. 4 étoiles : transit seulement. En rotation prochain cycle.',
  },
  {
    en: 'Replacement after flaky vendor missed cold chain twice. Here the cold pack was still cool at open, foam held glass, no cracked vials this time. Documentation friendly for university lab notes — batch, purity, dates without blank fields. Lab tech suggested next series after first vial; we agreed. Email subjects generic but answers useful. Happy we switched suppliers when PI pressure was on. Recommend with research-use caveat.',
    nl: 'Vervanging nadat wisselvallige vendor cold chain twee keer miste. Hier koude pack koel, schuim hield glas, geen gebarsten vials. Docs vriendelijk voor uni-labnotities — batch, puret, datums compleet. Lab tech stelde volgende serie voor na eerste vial. Mailonderwerpen generiek maar antwoorden nuttig. Blij gewisseld onder PI-druk. Aanbevolen met research-use caveat.',
    fr: 'Remplacement après chaîne du froid ratée deux fois ailleurs. Ici pack froid OK, mousse stable, pas de verre fissuré. Docs pratiques notes labo univ. — lot, pureté, dates complets. Tech a suggéré série suivante après 1er flacon. Objets mail génériques mais réponses utiles. Content d\'avoir changé sous pression PI. Recommandé avec caveat research-use.',
  },
  {
    en: 'Used in routine assays the week it landed. Label dosage spot on, stopper clean, no residue ring. We needed paperwork light — invoice and CoA enough for internal sign-off. Courier left at reception without drama; outer label did not scream peptide contents. Stable after fridge storage per product page. Five stars for boring reliability. Will keep spare in stock now.',
    nl: 'Gebruikt in routine assays week van aankomst. Dosering spot on, stopper schoon, geen residu-ring. Papierwerk licht — factuur en CoA genoeg voor intern tekenen. Koerier liet bij receptie achter; buitenlabel schreeuwde niet. Stabiel na koelkast per productpagina. Vijf sterren saaie betrouwbaarheid. Houden spare op voorraad.',
    fr: 'Utilisé en essais routine la semaine d\'arrivée. Dosage exact, bouchon propre, pas de résidu. Paperasse légère — facture et CoA suffisants. Livreur réception sans drama ; étiquette extérieure discrète. Stable au frigo selon fiche. 5 étoiles fiabilité ennuyeuse. On garde un spare.',
  },
  {
    en: 'PI wanted documentation-friendly material; this fit. Ordered overnight when stock ran out; got concrete tracking next morning. Compared well to last lot — reconstitution clean, no cloudy bits after mix. Cap torque right, shelf placement obvious from label layout. Minor note: mobile checkout could be smoother. Product and support were fine. Expect reorder before demo.',
    nl: 'PI wilde documentation-friendly materiaal; paste. \'s Nachts besteld bij lege voorraad; concrete tracking volgende ochtend. Vergelijkbaar met vorig lot — reconstitutie schoon. Dop oké, schap duidelijk via label. Klein punt: mobile checkout smoother kan. Product en support prima. Reorder vóór demo.',
    fr: 'PI voulait matériel avec docs ; OK. Commandé la nuit stock épuisé ; suivi concret le matin. Comparable lot précédent — reconstitution propre. Bouchon OK, rangement clair via étiquette. Détail : checkout mobile pourrait être plus fluide. Produit et support OK. Recommande avant démo.',
  },
  {
    en: 'Bench validation run after reading published lab results. Seal date made sense, batch readable, CoA PDF matched sticker. We treat as research-use only and site copy is clear about that framing. Receiving logged it without reconciliation call. Foam no rattle, glass intact, cold still cool. Colleague on late shift said support answered quickly about BAC water pairing. Solid vial; reorder soon unless something changes.',
    nl: 'Bench-validatie na lab-results gelezen. Zegeldatum logisch, batch leesbaar, CoA PDF = sticker. Alleen research-use; sitecopy duidelijk. Ontvangst zonder reconciliatiegesprek. Schuim stil, glas intact, koude koel. Collega late dienst: support snel over BAC water pairing. Solide vial; binnenkort opnieuw tenzij iets wijzigt.',
    fr: 'Validation paillasse après lab-results. Date scellé cohérente, lot lisible, CoA PDF = autocollant. Research-use uniquement ; site clair. Réception sans réconciliation. Mousse stable, verre intact, froid OK. Collègue tard : support rapide sur pairing BAC water. Flacon solide ; je recommande bientôt.',
  },
  {
    en: 'Third order from this shop — quality stayed consistent. First two were quiet; this one same: plain carton, intact seal, honest tracking. Admin paperwork stayed light which matters for small groups. Label fonts readable — small thing until you audit vials weekly. No upsell spam. Neighbor lab copied our SKU list. Four stars because email subjects still generic. Otherwise nothing to complain about.',
    nl: 'Derde order — kwaliteit consistent. Eerste twee rustig; deze ook: plain doos, intact zegel, eerlijke tracking. Admin licht — belangrijk voor kleine groepen. Labelfonts leesbaar. Geen upsell-spam. Buurlab kopieerde SKU-lijst. Vier sterren: mailonderwerpen nog generiek. Verder niets te klagen.',
    fr: '3e commande — qualité constante. Carton simple, scellé intact, suivi honnête. Admin léger — important petits groupes. Polices lisibles. Pas de spam upsell. Labo voisin a copié nos SKU. 4 étoiles : objets mail génériques. Sinon rien à redire.',
  },
  {
    en: 'Split budget with another line item; both arrived together. Vial matched photos, weight on sticker matched SKU, purity notes aligned with handling on bench. Opened same day, fridge overnight, no surprises. Support clarified storage in one mail — no vague FAQ link. Glad we did not cheap out when timeline was tight. Research-use only; we document that internally. On shortlist for standing list.',
    nl: 'Budget gesplitst met andere regel; samen gearriveerd. Vial = foto\'s, gewicht sticker = SKU, puretietnotities = bench-gedrag. Zelfde dag open, nacht koelkast. Support opslag in één mail. Blij niet goedkoop gegaan met strakke planning. Alleen research-use intern gedocumenteerd. Op vaste lijst shortlist.',
    fr: 'Budget partagé ; arrivés ensemble. Flacon = photos, poids sticker = SKU, notes pureté = paillasse. Ouvert jour même, nuit frigo. Support stockage un mail. Content de ne pas brader avec planning serré. Research-use documenté en interne. Sur shortlist liste permanente.',
  },
  {
    en: 'Demo week order — could not afford a supplier gamble. Delivered to institute reception, discreet outer box, cold pack acceptable. Reconstitution under SOP went fine; bench lead signed off. CoA fields complete for our log. Transit one day late so three stars, but vial quality was not the problem. Would still use for routine stock if PO allows.',
    nl: 'Demo-week order — geen vendor-gok kunnen riskeren. Receptie-instituut, discrete doos, koude pack oké. Reconstitutie onder SOP; bench lead akkoord. CoA compleet voor log. Transit dag laat → drie sterren, vial kwaliteit niet het probleem. Nog steeds voor routinevoorraad als PO het toelaat.',
    fr: 'Semaine démo — pas de pari vendeur. Réception institut, carton discret, froid acceptable. Reconstitution SOP OK ; lead a signé. CoA complet pour journal. Transit +1 jour → 3 étoiles, qualité flacon OK. Encore pour stock routine si PO le permet.',
  },
  {
    en: 'Casual buyer here — not a PI, just restocking for our small group. Checkout easy, emails clear, parcel looked normal on arrival. Vial fine, label ok, nothing leaked. dont know all the science words but colleague said purity notes looked fine. Would reorder when this runs out. Good enough I wrote a review.',
    nl: 'Gewone koper — geen PI, alleen bijvullen kleine groep. Checkout makkelijk, mails duidelijk, pakket normaal. Vial oké, label oké, geen lekkage. Ken niet alle wetenschapstaal maar collega zei puretietnotities goed. Opnieuw als op is. Goed genoeg voor review.',
    fr: 'Acheteur lambda — pas PI, réappro petit groupe. Paiement facile, mails clairs, colis normal. Flacon OK, étiquette OK, pas de fuite. Je ne connais pas tout le jargon mais collègue a dit pureté OK. Je rachète quand fini. Assez bien pour un avis.',
  },
  {
    en: 'Lab tech perspective: logged same day, batch string matched PDF, stopper seated clean. Reconstitution no floaters. Fridge storage overnight stable per SOP. Tracking honest. Four stars — wish checkout saved our institute address faster. Product side no complaints. Keeping in rotation for next assay batch.',
    nl: 'Lab tech perspectief: zelfde dag gelogd, batch = PDF, stopper schoon. Reconstitutie geen floaters. Koelkast nacht stabiel per SOP. Tracking eerlijk. Vier sterren — checkout kon adres sneller onthouden. Productkant geen klachten. Blijft in rotatie volgende assay-batch.',
    fr: 'Vue tech labo : inventorié jour même, lot = PDF, bouchon propre. Reconstitution sans particules. Frigo nuit stable SOP. Suivi honnête. 4 étoiles — checkout pourrait mémoriser adresse institut. Produit OK. Reste en rotation prochain batch essais.',
  },
];

// Product-name injection fragments (~40% of reviews)
const WITH_PRODUCT_LEAD: Frag[] = [
  { en: 'We ordered {p} for a short validation run.', nl: 'We bestelden {p} voor korte validatie.', fr: 'Nous avons commandé {p} pour une courte validation.' },
  { en: 'Picked up {p} after a colleague recommended GoPeptides.', nl: '{p} gekocht na collega-tip over GoPeptides.', fr: '{p} pris après conseil collègue GoPeptides.' },
  { en: 'Restocked {p} for our bench protocol.', nl: '{p} bijgevuld voor bench-protocol.', fr: 'Réappro {p} pour protocole paillasse.' },
  { en: 'Our PI asked specifically for {p}.', nl: 'PI vroeg specifiek om {p}.', fr: 'PI a demandé précisément {p}.' },
  { en: 'First time ordering {p} from this shop.', nl: 'Eerste keer {p} hier besteld.', fr: 'Première commande de {p} ici.' },
  { en: 'Came back for {p} after a quiet first order.', nl: 'Terug voor {p} na rustige eerste order.', fr: 'Revenu pour {p} après 1re commande calme.' },
  { en: 'Used {p} the same week it arrived.', nl: '{p} dezelfde week gebruikt.', fr: '{p} utilisé la semaine d\'arrivée.' },
  { en: 'Reordered {p} when the last vial finished.', nl: '{p} opnieuw toen vial op was.', fr: 'Recommandé {p} après le flacon.' },
  { en: 'Added {p} to our standing research list.', nl: '{p} op vaste research-lijst.', fr: '{p} ajouté à liste research.' },
  { en: 'Compared quotes and kept {p} here.', nl: 'Quotes vergeleken en {p} hier gehouden.', fr: 'Devis comparés, gardé {p} ici.' },
  { en: '{p} handled predictably on the bench.', nl: '{p} gedroeg zich voorspelbaar op bench.', fr: '{p} prévisible à la paillasse.' },
  { en: 'Small order of {p} to test shipping.', nl: 'Kleine order {p} voor shipping-test.', fr: 'Petite commande {p} pour test expédition.' },
  { en: 'Logged {p} into inventory same day.', nl: '{p} dezelfde dag in inventaris.', fr: '{p} inventorié le jour même.' },
  { en: 'Opened {p} under our usual SOP.', nl: '{p} geopend onder SOP.', fr: '{p} ouvert sous SOP.' },
  { en: 'Night order for {p} with morning tracking.', nl: 'Nachtorder {p} met ochtend-tracking.', fr: 'Commande nocturne {p}, suivi matin.' },
];

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function fill(frag: Frag, product: string): Frag {
  return {
    en: frag.en.replaceAll('{p}', product),
    nl: frag.nl.replaceAll('{p}', product),
    fr: frag.fr.replaceAll('{p}', product),
  };
}

function daysAgo(n: number, hour: number, minute: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function seedEmail(productId: string, index: number): string {
  return `r.${productId.slice(0, 8)}.${index}@${SEED_DOMAIN}`;
}

/** Stable 0–4 per slug; adjust fleet-wide to sum near TARGET. */
function distributeCounts(slugs: string[], target: number): Map<string, number> {
  const counts = new Map<string, number>();
  let total = 0;
  for (const slug of slugs) {
    const c = hashStr(slug) % 5;
    counts.set(slug, c);
    total += c;
  }
  const sorted = [...slugs].sort((a, b) => hashStr(a) - hashStr(b));
  let guard = 0;
  while (total < target && guard < slugs.length * 20) {
    const slug = sorted[guard % sorted.length];
    const cur = counts.get(slug)!;
    if (cur < 4) {
      counts.set(slug, cur + 1);
      total++;
    }
    guard++;
  }
  guard = 0;
  while (total > target && guard < slugs.length * 20) {
    const slug = sorted[sorted.length - 1 - (guard % sorted.length)];
    const cur = counts.get(slug)!;
    if (cur > 0) {
      counts.set(slug, cur - 1);
      total--;
    }
    guard++;
  }
  return counts;
}

function pickRating(rng: () => number, bodyEn: string): number {
  if (/three stars|drie sterren|3 étoiles|3 stars/i.test(bodyEn)) return 3;
  if (/four stars|vier sterren|4 étoiles|4 stars/i.test(bodyEn)) return 4;
  const r = rng();
  if (r < 0.07) return 3;
  if (r < 0.28) return 4;
  return 5;
}

function pickTitle(rng: () => number): Frag {
  if (rng() < 0.35) return SHORT_TITLES[Math.floor(rng() * SHORT_TITLES.length)];
  return LONG_TITLES[Math.floor(rng() * LONG_TITLES.length)];
}

interface BuiltReview {
  title: Frag;
  body: Frag;
  band: Band;
  sig: string;
}

function buildReview(
  band: Band,
  idx: number,
  useProduct: boolean,
  productName: string,
  rng: () => number,
): BuiltReview {
  const title = pickTitle(rng);
  let body: Frag;
  let sig: string;

  if (band === 'ultra') {
    const u = ULTRA[idx % ULTRA.length];
    if (useProduct && rng() < 0.5) {
      const shortWithP: Frag = {
        en: `${productName} — solid. Reorder soon.`,
        nl: `${productName} — stevig. Binnenkort opnieuw.`,
        fr: `${productName} — solide. Je recommande.`,
      };
      body = shortWithP;
    } else {
      body = u;
    }
    sig = `u-${idx}-${useProduct ? 1 : 0}-${body.en.slice(0, 40)}`;
  } else if (band === 'short') {
    const s = ONE_SENTENCE[idx % ONE_SENTENCE.length];
    if (useProduct && rng() < 0.45) {
      const lead = fill(WITH_PRODUCT_LEAD[idx % WITH_PRODUCT_LEAD.length], productName);
      body = { en: `${lead.en} ${s.en}`, nl: `${lead.nl} ${s.nl}`, fr: `${lead.fr} ${s.fr}` };
    } else {
      body = s;
    }
    sig = `s-${idx}-${body.en.slice(0, 50)}`;
  } else if (band === 'medium') {
    const a = MEDIUM_A[idx % MEDIUM_A.length];
    const b = MEDIUM_B[(idx * 3 + 7) % MEDIUM_B.length];
    const c = MEDIUM_C[(idx * 5 + 11) % MEDIUM_C.length];
    if (useProduct) {
      const lead = fill(WITH_PRODUCT_LEAD[idx % WITH_PRODUCT_LEAD.length], productName);
      body = { en: `${lead.en} ${b.en} ${c.en}`, nl: `${lead.nl} ${b.nl} ${c.nl}`, fr: `${lead.fr} ${b.fr} ${c.fr}` };
    } else {
      body = { en: `${a.en} ${b.en} ${c.en}`, nl: `${a.nl} ${b.nl} ${c.nl}`, fr: `${a.fr} ${b.fr} ${c.fr}` };
    }
    sig = `m-${idx}-${a.en.slice(0, 20)}-${b.en.slice(0, 20)}-${c.en.slice(0, 20)}`;
  } else {
    const l = LONG[idx % LONG.length];
    if (useProduct && rng() < 0.5) {
      const lead = fill(WITH_PRODUCT_LEAD[idx % WITH_PRODUCT_LEAD.length], productName);
      body = { en: `${lead.en} ${l.en}`, nl: `${lead.nl} ${l.nl}`, fr: `${lead.fr} ${l.fr}` };
    } else {
      body = l;
    }
    sig = `l-${idx}-${body.en.slice(0, 60)}`;
  }

  return { title, body, band, sig };
}

function bandPlan(total: number): Band[] {
  const nUltra = Math.round(total * 0.2);
  const nShort = Math.round(total * 0.35);
  const nMedium = Math.round(total * 0.3);
  const nLong = total - nUltra - nShort - nMedium;
  return [
    ...Array<Band>(nUltra).fill('ultra'),
    ...Array<Band>(nShort).fill('short'),
    ...Array<Band>(nMedium).fill('medium'),
    ...Array<Band>(nLong).fill('long'),
  ];
}

async function main() {
  const wipe = await prisma.review.deleteMany({
    where: { guestEmail: { endsWith: `@${SEED_DOMAIN}` } },
  });
  console.log(`Removed previous seeded reviews: ${wipe.count}`);

  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true },
  });

  if (!products.length) {
    console.log('No active products — nothing to seed');
    return;
  }

  const countMap = distributeCounts(
    products.map((p) => p.slug),
    TARGET,
  );
  const totalPlanned = [...countMap.values()].reduce((a, b) => a + b, 0);

  const rng = mulberry32(0xc0ffee);
  const namePool = [...NAMES];
  for (let i = namePool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [namePool[i], namePool[j]] = [namePool[j], namePool[i]];
  }

  const bands = bandPlan(totalPlanned);
  for (let i = bands.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [bands[i], bands[j]] = [bands[j], bands[i]];
  }

  const dayBag = Array.from({ length: 277 }, (_, i) => 4 + i);
  for (let i = dayBag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [dayBag[i], dayBag[j]] = [dayBag[j], dayBag[i]];
  }

  const usedBodies = new Set<string>();
  const reviews: Array<{
    productId: string;
    slug: string;
    guestName: string;
    guestEmail: string;
    rating: number;
    title: Frag;
    body: Frag;
    createdAt: Date;
    band: Band;
  }> = [];

  let globalIdx = 0;
  let nameIdx = 0;
  let dayPtr = 0;

  for (const product of products) {
    const n = countMap.get(product.slug) ?? 0;
    const shortName = product.name.replace(/\s+/g, ' ').trim();

    for (let i = 0; i < n; i++) {
      const band = bands[globalIdx] ?? 'short';
      const useProduct = rng() < 0.4;
      let built: BuiltReview | null = null;

      for (let attempt = 0; attempt < 500; attempt++) {
        const candidate = buildReview(band, globalIdx + attempt, useProduct, shortName, rng);
        const bodyKey = candidate.body.en.trim().toLowerCase();
        if (usedBodies.has(bodyKey)) continue;
        usedBodies.add(bodyKey);
        built = candidate;
        break;
      }

      if (!built) {
        throw new Error(`Could not build unique review for ${product.slug} #${i}`);
      }

      const guestName = namePool[nameIdx % namePool.length];
      nameIdx++;
      const rating = pickRating(rng, built.body.en);
      const day = dayBag[dayPtr % dayBag.length];
      dayPtr++;
      const hour = 7 + Math.floor(rng() * 14);
      const minute = Math.floor(rng() * 60);

      reviews.push({
        productId: product.id,
        slug: product.slug,
        guestName,
        guestEmail: seedEmail(product.id, i),
        rating,
        title: built.title,
        body: built.body,
        createdAt: daysAgo(day, hour, minute),
        band: built.band,
      });
      globalIdx++;
    }
  }

  for (const r of reviews) {
    await prisma.review.create({
      data: {
        productId: r.productId,
        guestName: r.guestName,
        guestEmail: r.guestEmail,
        rating: r.rating,
        title: r.title.en,
        body: r.body.en,
        translations: JSON.stringify({
          nl: { title: r.title.nl, body: r.body.nl },
          fr: { title: r.title.fr, body: r.body.fr },
        }),
        verified: true,
        approved: true,
        createdAt: r.createdAt,
      },
    });
  }

  const all = await prisma.review.findMany({
    where: { guestEmail: { endsWith: `@${SEED_DOMAIN}` } },
    select: { body: true },
  });
  const bodies = all.map((r) => r.body);
  if (new Set(bodies).size !== bodies.length) {
    throw new Error(`Duplicate bodies: ${bodies.length - new Set(bodies).size}`);
  }

  const words = bodies.map(wordCount);
  const perSlug = products.map((p) => ({ slug: p.slug, n: countMap.get(p.slug) ?? 0 }));
  const perCounts = perSlug.map((x) => x.n);
  const minW = Math.min(...words);
  const maxW = Math.max(...words);
  const nonzero = perCounts.filter((n) => n > 0);

  if (all.length < 100 || all.length > 120) {
    throw new Error(`Total ${all.length} outside 100–120 band`);
  }
  if (minW > 8 || maxW < 45) {
    throw new Error(`Word spread failed: ${minW}–${maxW} (need ≤8 min, ≥45 max)`);
  }
  if (nonzero.length && Math.min(...nonzero) === Math.max(...nonzero)) {
    throw new Error('All reviewed products share the same count');
  }

  console.log(`Seeded ${all.length} unique reviews across ${products.length} products.`);
  console.log(`Per-product range: ${Math.min(...perCounts)}–${Math.max(...perCounts)} (target ~${TARGET})`);
  console.log(`Word count range: ${minW}–${maxW}`);
  console.log(perSlug.map((x) => `${x.slug}:${x.n}`).join(', '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
