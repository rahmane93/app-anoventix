-- =====================================================================
--  V14 — Référentiel géographique de la Guinée (données)
-- =====================================================================
--  Reprise de sql/localisation.sql (fichier retiré), jusqu'ici chargé seulement par
--  l'initialisation du conteneur PostgreSQL (volume vierge) : une base
--  créée autrement restait sans quartier, donc sans publication possible.
--  Idempotent (ON CONFLICT DO NOTHING) : sans effet sur une base déjà
--  alimentée. 743 quartiers, 369 communes, 34 préfectures, 8 régions.
--  Les ajouts ultérieurs passent par l'administration ou une migration.
-- =====================================================================

INSERT INTO localisation (id, region, prefecture, commune, quartier, type_commune) values

-- ============================================================================
-- REGION DE CONAKRY (capitale — préfecture unique, communes toutes urbaines)
-- ============================================================================
-- CONAKRY - Commune Kassa
('1df8cb25-370f-59e8-b6fc-c5cdee76f059', 'Conakry', 'Conakry', 'Kassa', 'Ile de Kassa', 'urbaine'),
('4eefd6f8-9378-58b1-911f-6990a1c8fbef', 'Conakry', 'Conakry', 'Kassa', 'Soro', 'urbaine'),
('dc706ed0-44b1-5527-ba16-6d64ed2a9ff8', 'Conakry', 'Conakry', 'Kassa', 'Kassa 1', 'urbaine'),
('1d462edd-ecd6-5f0b-860a-4c95f8594c28', 'Conakry', 'Conakry', 'Kassa', 'Kassa 2', 'urbaine'),
('5429cfd5-a598-590d-9c1c-45c57ba47272', 'Conakry', 'Conakry', 'Kassa', 'Kassa 3', 'urbaine'),
('dd4318aa-d5c9-5157-b03e-8ddb03ea0f03', 'Conakry', 'Conakry', 'Kassa', 'Koromandja', 'urbaine'),
('7b941532-a5ed-5c3f-a531-feb2fd2d201e', 'Conakry', 'Conakry', 'Kassa', 'Mangue', 'urbaine'),
('49e1bb5b-ad2b-509a-932a-5ba356511070', 'Conakry', 'Conakry', 'Kassa', 'Room', 'urbaine'),
('22be5e72-0635-539b-8681-de0e2a0b8efb', 'Conakry', 'Conakry', 'Kassa', 'Fotoba Centre', 'urbaine'),
('9bfaa4d1-5181-5588-b27b-74da1127f72c', 'Conakry', 'Conakry', 'Kassa', 'Rogbanet', 'urbaine'),
('a2323305-ffa6-5849-8ce6-4b215814d296', 'Conakry', 'Conakry', 'Kassa', 'Boom', 'urbaine'),
-- CONAKRY - Commune Kaloum
('f8cc4d074ea74aa8d375d0d16e43ca01', 'Conakry', 'Conakry', 'Kaloum', 'Tombo', 'urbaine'),
('1c75f4ddb32488778a703e6f08e296a3', 'Conakry', 'Conakry', 'Kaloum', 'Témitaye', 'urbaine'),
('895670e2b021b7aaab46c789da482220', 'Conakry', 'Conakry', 'Kaloum', 'Sans-fil', 'urbaine'),
('d79e56a5add51a5f99b6442379133bd9', 'Conakry', 'Conakry', 'Kaloum', 'Sandervalia', 'urbaine'),
('9ff27e300c6d6f33602656b8f3ff6c7c', 'Conakry', 'Conakry', 'Kaloum', 'Manquepas', 'urbaine'),
('71f0c52f59af1f1cbe7ce3bc6db3257f', 'Conakry', 'Conakry', 'Kaloum', 'Kouléwondy', 'urbaine'),
('19a5826947f7559daf7f65ea78091abc', 'Conakry', 'Conakry', 'Kaloum', 'Kaloum', 'urbaine'),
('da25fb674ba62016c43ea57366bada36', 'Conakry', 'Conakry', 'Kaloum', 'Coronthie', 'urbaine'),
('f0e8ae8a0658b332abdd99429aa17586', 'Conakry', 'Conakry', 'Kaloum', 'Almamya', 'urbaine'),
('2e56bf1f5772636ca440773168fd55e6', 'Conakry', 'Conakry', 'Kaloum', 'Boulbinet', 'urbaine'),
-- CONAKRY - Commune Matam
('7165c68bdceedcdf8d495617d98c5b11', 'Conakry', 'Conakry', 'Matam', 'Touguiwondy', 'urbaine'),
('977fd7b38dc63a30775161ca3bec0171', 'Conakry', 'Conakry', 'Matam', 'Matam-lido', 'urbaine'),
('7c9e97a22d3eb97c7f213ad93f25f437', 'Conakry', 'Conakry', 'Matam', 'Matam', 'urbaine'),
('c50f2a98a40ff5afba878b4519b6a5fd', 'Conakry', 'Conakry', 'Matam', 'Mafonco-centre', 'urbaine'),
('a3a4b85322f901d5edad86f2d11ce422', 'Conakry', 'Conakry', 'Matam', 'Mafanco', 'urbaine'),
('fa3d2a0d7043accc5784ef358c6411f0', 'Conakry', 'Conakry', 'Matam', 'Madina-mosquée', 'urbaine'),
('2a08ad40925984ea7a727bf98478ac63', 'Conakry', 'Conakry', 'Matam', 'Madina-marché', 'urbaine'),
('c7ed075dd3787674052cb627ac0de21f', 'Conakry', 'Conakry', 'Matam', 'Madina-école', 'urbaine'),
('882a6aa421d9372d7f4bee2b29002aa8', 'Conakry', 'Conakry', 'Matam', 'Madina-cité', 'urbaine'),
('62006509d697a0569846e067e1475dfa', 'Conakry', 'Conakry', 'Matam', 'Madina-centre', 'urbaine'),
('ab94e4ce27e8af53bef37a66458a806c', 'Conakry', 'Conakry', 'Matam', 'Lanséboudji', 'urbaine'),
('a6baa7436bc62fd74843fe5fbcb4c340', 'Conakry', 'Conakry', 'Matam', 'Imprimerie', 'urbaine'),
('fa15ddaf3cca68b8fadf0c6e0ab89079', 'Conakry', 'Conakry', 'Matam', 'Hermakönon', 'urbaine'),
('a065403eecaced145e1caa36e80d6567', 'Conakry', 'Conakry', 'Matam', 'Domino', 'urbaine'),
('79a6ab3b2b3d0daea98077f866ac8b73', 'Conakry', 'Conakry', 'Matam', 'Coléah-cité', 'urbaine'),
('b3e822372c120cad07ef3a416202a70f', 'Conakry', 'Conakry', 'Matam', 'Coléah-centre', 'urbaine'),
('2aa647227b87446833b84b10417c37f3', 'Conakry', 'Conakry', 'Matam', 'Carrière', 'urbaine'),
('c8d8a0f2c941934b7e354aa761446d74', 'Conakry', 'Conakry', 'Matam', 'Bonfi-marché', 'urbaine'),
('a03ed611db1b646de04d5d54c6c1dd97', 'Conakry', 'Conakry', 'Matam', 'Bonfi-routière', 'urbaine'),
('b1a4f826c2507e4c027a6e29b097114b', 'Conakry', 'Conakry', 'Matam', 'Bonfi', 'urbaine'),
('b259617e7abf14ff7bcecf872142dc00', 'Conakry', 'Conakry', 'Matam', 'Boussoura', 'urbaine'),
-- CONAKRY - Commune Dixinn
('7ce5fc4ed5dedcce2fcc674802fe87cb', 'Conakry', 'Conakry', 'Dixinn', 'Minière-cité', 'urbaine'),
('2aa0ffec48193276b879f9248f6f3d4c', 'Conakry', 'Conakry', 'Dixinn', 'Landréah', 'urbaine'),
('f86d77eda4e3e741b6222ac462cf250b', 'Conakry', 'Conakry', 'Dixinn', 'Kénien', 'urbaine'),
('0f6453cbcd8485ba46d99645080eda63', 'Conakry', 'Conakry', 'Dixinn', 'Hafia-mosquée', 'urbaine'),
('31fc266f80cd15176b2be66768e4d35d', 'Conakry', 'Conakry', 'Dixinn', 'Hafia-minière', 'urbaine'),
('9788a1c8514dee5c352f0df111a986d6', 'Conakry', 'Conakry', 'Dixinn', 'Hafia 2', 'urbaine'),
('1dbd139b481fd475aca603e155a6bdcb', 'Conakry', 'Conakry', 'Dixinn', 'Hafia 1', 'urbaine'),
('26b5c364c84b322d01bd8ee0bbe94c89', 'Conakry', 'Conakry', 'Dixinn', 'Dixinn-port', 'urbaine'),
('80bfc8d55b11c5e09bc9c417a81f4dfd', 'Conakry', 'Conakry', 'Dixinn', 'Dixinn-mosquée', 'urbaine'),
('93564eaf85bc43bdf1fa009690366dc0', 'Conakry', 'Conakry', 'Dixinn', 'Dixinn-gare-rails', 'urbaine'),
('6d28ee46bbce6fd5880ddd727d6467cb', 'Conakry', 'Conakry', 'Dixinn', 'Dixinn-gare', 'urbaine'),
('f49b072ba59b61a77db7d82d71cc0108', 'Conakry', 'Conakry', 'Dixinn', 'Dixinn-cité 2', 'urbaine'),
('e1485f4153c61db18434d2434d373d74', 'Conakry', 'Conakry', 'Dixinn', 'Dixinn-cité1', 'urbaine'),
('47a53c4ad6d7d5b9142a94fa69f5fab1', 'Conakry', 'Conakry', 'Dixinn', 'Cameroun', 'urbaine'),
('6851ce218bb85918efbf2afbb4c4243d', 'Conakry', 'Conakry', 'Dixinn', 'Camayenne', 'urbaine'),
('91d9f0498a3978c1e0051d5431945735', 'Conakry', 'Conakry', 'Dixinn', 'Belle-vue-marché', 'urbaine'),
('25c501dea15fee148703671e07253cbd', 'Conakry', 'Conakry', 'Dixinn', 'Belle-vue école', 'urbaine'),
('341c535b7289d2bb8161f0827aa8e6c2', 'Conakry', 'Conakry', 'Ratoma', 'Kaporo Centre', 'urbaine'),
-- CONAKRY - Commune Ratoma
('97e4beda55abae4925fae68f757209bf', 'Conakry', 'Conakry', 'Ratoma', 'Kipé', 'urbaine'),
('4fe9b0761b0d41660229d2ee738ff3de', 'Conakry', 'Conakry', 'Ratoma', 'Koloma Soloprimo', 'urbaine'),
('71c3ad2e4eefdb97a69ff5be8cf827f8', 'Conakry', 'Conakry', 'Ratoma', 'Hamdallaye 2', 'urbaine'),
('e8c5f7f434dc041cc4fad9d25e6e0b27', 'Conakry', 'Conakry', 'Ratoma', 'Hamdallaye 1', 'urbaine'),
('69a635ce0e8dc2f24ed98171d924a4a1', 'Conakry', 'Conakry', 'Ratoma', 'Kaporo Rails', 'urbaine'),
('48d091a0d75c345e0764b6ce6783f26a', 'Conakry', 'Conakry', 'Ratoma', 'Ratoma Centre', 'urbaine'),
('8d6dc414f5dc378356bf2a1f7e25f25c', 'Conakry', 'Conakry', 'Ratoma', 'Ratoma Dispensaire', 'urbaine'),
('ef7c1ee95a19c863f0c0afed9f64be27', 'Conakry', 'Conakry', 'Ratoma', 'Taouyah', 'urbaine'),
('62929654ccba0a1289089f9c79177790', 'Conakry', 'Conakry', 'Matoto', 'Wanindara Marché', 'urbaine'),
('d3b59ee8e16b4f6bf914014913c54484', 'Conakry', 'Conakry', 'Matoto', 'Wanindara Dispensaire', 'urbaine'),
('456f7757e4b57099e78d4d040ba48ccd', 'Conakry', 'Conakry', 'Matoto', 'Marché Enco 5', 'urbaine'),
('ade5f351ccaad1ea3236322d2ec5993f', 'Conakry', 'Conakry', 'Matoto', 'Kissosso Plateau', 'urbaine'),
('47b4f7a00c7231754713498975e5db27', 'Conakry', 'Conakry', 'Matoto', 'Kissosso', 'urbaine'),
('3294dc868bd7cf7f1c2cf6c0f7d65db9', 'Conakry', 'Conakry', 'Matoto', 'Sangoyah Marché', 'urbaine'),
('843964d0e0fb9f4de54393d85642047d', 'Conakry', 'Conakry', 'Matoto', 'Sangoyah Mosquée', 'urbaine'),
('e8c4e388274f711546519853183ff159', 'Conakry', 'Conakry', 'Matoto', 'Matoto Khabitaya', 'urbaine'),
('d1ec3fb339f6cf63c8da79b6ce551a44', 'Conakry', 'Conakry', 'Matoto', 'Matoto Marché', 'urbaine'),
('b79c4533a2179151e8a1cf23cb48328a', 'Conakry', 'Conakry', 'Matoto', 'Simbaya Ecole', 'urbaine'),
('694a7ba899da2d19d5110f22a8365bcf', 'Conakry', 'Conakry', 'Matoto', 'Simbaya 2', 'urbaine'),
('8f3cbca8a0ca331756a32efe7415f658', 'Conakry', 'Conakry', 'Matoto', 'Matato Centre', 'urbaine'),
('d2896da7a2ba86a4774ef987be6a61f7', 'Conakry', 'Conakry', 'Gbessia', 'Nassouroulaye', 'urbaine'),
('fb8e49d717ffb2267b86950d79b3b8b6', 'Conakry', 'Conakry', 'Gbessia', 'Koloma 2', 'urbaine'),
('5656f848dd237f5d61ff5d4e86cbebce', 'Conakry', 'Conakry', 'Gbessia', 'Koloma 1', 'urbaine'),
('26884876760b1b78b7cbb0166d27f7c3', 'Conakry', 'Conakry', 'Gbessia', 'Simbaya 1', 'urbaine'),
('8220e2e350922fe5b5a20e1702d62700', 'Conakry', 'Conakry', 'Gbessia', 'Yimbaya Tannerie', 'urbaine'),
('bd3dd1e755cd3dc8bb75da0eea622b25', 'Conakry', 'Conakry', 'Gbessia', 'Hamdallaye Mosquée', 'urbaine'),
('aac93927b8499dc557d0bacda595af7b', 'Conakry', 'Conakry', 'Gbessia', 'Yimbaya Port', 'urbaine'),
('e4c7469e5162bac76c7687a6f4735e1d', 'Conakry', 'Conakry', 'Gbessia', 'Yimbaya Permanence', 'urbaine'),
('31f896e10b15af4f5848092f5734f6b8', 'Conakry', 'Conakry', 'Gbessia', 'Yimbaya Ecole', 'urbaine'),
('d2e41dca2120cd674750390e7dcd3157', 'Conakry', 'Conakry', 'Gbessia', 'Tanènè Mosquée', 'urbaine'),
('72d7edd3da5195041064245218019f02', 'Conakry', 'Conakry', 'Gbessia', 'Tanènè Marché', 'urbaine'),
('b4a483dc13e492b09d1e78a162725338', 'Conakry', 'Conakry', 'Gbessia', 'Béhanzin', 'urbaine'),
('2eb63b2e6cde557a6a8515e72c956ba7', 'Conakry', 'Conakry', 'Gbessia', 'Cité de l''air', 'urbaine'),
('a27f103ad7f746dbe12a187698782086', 'Conakry', 'Conakry', 'Gbessia', 'Dar-Es-Salam', 'urbaine'),
('f60396dc54d6fa6ab3e894c427abdc8e', 'Conakry', 'Conakry', 'Gbessia', 'Gbessia Port 2', 'urbaine'),
('b211fee8eb0836d85b216a85432dee69', 'Conakry', 'Conakry', 'Gbessia', 'Gbessia Port 1', 'urbaine'),
('4bbe69db1ecbb7db36b3d0eae7fc7c55', 'Conakry', 'Conakry', 'Gbessia', 'Gbessia Centre', 'urbaine'),
('33cc8f670ea16866da0ca2d948c9e4db', 'Conakry', 'Conakry', 'Gbessia', 'Gbessia Ecole', 'urbaine'),
('24761e3c2637f1003b029ccd903f7171', 'Conakry', 'Conakry', 'Gbessia', 'Gbessia Cité 3', 'urbaine'),
('82cc65f256cd227bae0157f7aa1a3f36', 'Conakry', 'Conakry', 'Gbessia', 'Gbessia Cité 2', 'urbaine'),
('323e81129bc1447052af7eccfeaed2c5', 'Conakry', 'Conakry', 'Gbessia', 'Gbessia Cité 1', 'urbaine'),
('e2ef385dbb5872bf170108bf0f48090e', 'Conakry', 'Conakry', 'Gbessia', 'Dabondy Rails', 'urbaine'),
('1ed55f9823b083ab3b9f40fff30f1a4a', 'Conakry', 'Conakry', 'Gbessia', 'Dabondy Ecole', 'urbaine'),
('6d4f4488ab227f8fa67bacb27cf9907a', 'Conakry', 'Conakry', 'Gbessia', 'Dabondy 3', 'urbaine'),
('21af449606e5966400cb46af7d04c061', 'Conakry', 'Conakry', 'Gbessia', 'Dabondy 2', 'urbaine'),
('64556decb41695281c893d69f1523b84', 'Conakry', 'Conakry', 'Gbessia', 'Dabondy 1', 'urbaine'),
('de792000bca7d25054949fca49052743', 'Conakry', 'Conakry', 'Lambanyi', 'Kinifi', 'urbaine'),
('ab476ab316aa2c302a9e60e2a16a3d3b', 'Conakry', 'Conakry', 'Lambanyi', 'Wanindara Rails', 'urbaine'),
('a5c297dd1054bbf328e00a1a74c31653', 'Conakry', 'Conakry', 'Lambanyi', 'Wanindara', 'urbaine'),
('8d92c007fce4cfb14c189d04ad844186', 'Conakry', 'Conakry', 'Lambanyi', 'Soumambossia', 'urbaine'),
('af586d687f71d7f4f14c2d345a8581dd', 'Conakry', 'Conakry', 'Lambanyi', 'Bantounka 2', 'urbaine'),
('111762f0939a4e7d5739081a3fa042b6', 'Conakry', 'Conakry', 'Lambanyi', 'Bantounka 1', 'urbaine'),
('f69c3ac8cd1ea48544aa823d3288d6bc', 'Conakry', 'Conakry', 'Lambanyi', 'Nassouroulaye', 'urbaine'),
('ef267495b668e596145876df7f9fb624', 'Conakry', 'Conakry', 'Lambanyi', 'Yattaya centre', 'urbaine'),
('bf880132fb30f9e469a48e19b6e68981', 'Conakry', 'Conakry', 'Lambanyi', 'Simbaya Gare', 'urbaine'),
('c34bf71ceb15048f5ea8d82e02668ffe', 'Conakry', 'Conakry', 'Lambanyi', 'Waréah', 'urbaine'),
('9f4924a8a02d4ed2e875221bf92d51e8', 'Conakry', 'Conakry', 'Lambanyi', 'Yembeya', 'urbaine'),
('6d6d04e3427bcc520032fd9f8c3d37c8', 'Conakry', 'Conakry', 'Lambanyi', 'Lambanyi', 'urbaine'),
('014f52f7532ae9a189118887a314b02d', 'Conakry', 'Conakry', 'Lambanyi', 'Nongo Taady', 'urbaine'),
('42fcadd6f26410cee1a5b72ae57eab47', 'Conakry', 'Conakry', 'Lambanyi', 'Nongo-centre', 'urbaine'),
('53a7b65d51afce5c6ac449452a10291b', 'Conakry', 'Conakry', 'Sonfonia', 'Sonfonia Centre 2', 'urbaine'),
('423e9b1f39c6d41e656b8f0fff6b99aa', 'Conakry', 'Conakry', 'Sonfonia', 'Sonfonia Centre 1', 'urbaine'),
('36d166b8bbafb6773ed80790a2cfdbbe', 'Conakry', 'Conakry', 'Sonfonia', 'Sonfonia Gare 2', 'urbaine'),
('6b8bc422f634d5f5d80410bbed70d96a', 'Conakry', 'Conakry', 'Sonfonia', 'Sonfonia Gare 1', 'urbaine'),
('a88da547a0eda8eb1418342b40267b49', 'Conakry', 'Conakry', 'Sonfonia', 'Yattaya centre', 'urbaine'),
('792690d2cfa26da99d7298f8d51d6e18', 'Conakry', 'Conakry', 'Sonfonia', 'Yattaya Fossidet', 'urbaine'),
('d707eeede510d5a8d5f3d4a38d5a961f', 'Conakry', 'Conakry', 'Sonfonia', 'Kobayah', 'urbaine'),
('02f3e68432c2f4216cb626b304635a8b', 'Conakry', 'Conakry', 'Tombolia', 'Lansanayah', 'urbaine'),
('180e2b90b3a69df03afe3a72dd870757', 'Conakry', 'Conakry', 'Tombolia', 'Dabompa Plateau', 'urbaine'),
('081baca3b7f7e376e7db678712b18d49', 'Conakry', 'Conakry', 'Tombolia', 'Dabompa Village', 'urbaine'),
('fb695cd37edaf0be1c233c488e3ed3ed', 'Conakry', 'Conakry', 'Tombolia', 'Tombolia Plateau', 'urbaine'),
('a47a7d8d0813a63c3d0ae89fbef1c8a3', 'Conakry', 'Conakry', 'Tombolia', 'Tombolia', 'urbaine'),
('3708cb78ff92c327ce8aae653cac8686', 'Conakry', 'Conakry', 'Tombolia', 'Enta Fassa', 'urbaine'),
('1841bb24b616839b2c2c1941530af9a2', 'Conakry', 'Conakry', 'Tombolia', 'Enta Marché', 'urbaine'),
('b05faef9-156d-57d8-8680-f0420160d2c4', 'Conakry', 'Conakry', 'Kagbelen', 'Kenende', 'urbaine'),
('c66befa7-de42-5cb9-9d03-582fb4f36187', 'Conakry', 'Conakry', 'Kagbelen', 'Kagbelen Village', 'urbaine'),
('c95c3ec5-904d-55d4-bfac-08486a3a4349', 'Conakry', 'Conakry', 'Kagbelen', 'Kagbelen Plateau', 'urbaine'),
('6190fbb8-338c-5b10-8c68-e6c800a6be20', 'Conakry', 'Conakry', 'Kagbelen', 'Dondolkhoure', 'urbaine'),
('30e9474e-93c0-5fb1-8bb3-391d60978ef3', 'Conakry', 'Conakry', 'Kagbelen', 'Kindiady', 'urbaine'),
('5989aad7-893e-5bf2-80c9-e3be08e1ecf4', 'Conakry', 'Conakry', 'Kagbelen', 'Tobolon 1', 'urbaine'),
('b441e16a-5e93-533a-b798-bfc8ad70fb3a', 'Conakry', 'Conakry', 'Kagbelen', 'Tobolon 2', 'urbaine'),
('e2ffe832-24d2-581c-be0c-2e2a86b76172', 'Conakry', 'Conakry', 'Kagbelen', 'Keitayah', 'urbaine'),
('5c334625-4cdd-506b-a749-804ab6ed6375', 'Conakry', 'Conakry', 'Kagbelen', 'Ansoumania Plateau', 'urbaine'),
('a2ff138b-12a7-5050-88f8-b1551f2870c8', 'Conakry', 'Conakry', 'Kagbelen', 'Tanga', 'urbaine'),
('2055984a-7f61-5232-ba51-b1d5ed2ab1b0', 'Conakry', 'Conakry', 'Kagbelen', 'Kirkiland', 'urbaine'),
('02835432-13fa-5862-9a8d-95ed6d50c3aa', 'Conakry', 'Conakry', 'Kagbelen', 'Fofomere', 'urbaine'),
('0a4e87ad-cd2f-5f48-994b-81acdafd7605', 'Conakry', 'Conakry', 'Kagbelen', 'Bailobaya Centre', 'urbaine'),
('a61a5126-4872-55ce-a1ff-c8249d64c5d7', 'Conakry', 'Conakry', 'Kagbelen', 'Bailobaya Plateau', 'urbaine'),

('99622f41-5ba3-5e90-8bda-61389009d35b', 'Conakry', 'Conakry', 'Sanoyah', 'Sanoyah Km36', 'urbaine'),
('fe706099-4ede-56dd-8b32-9ba82d7b700c', 'Conakry', 'Conakry', 'Sanoyah', 'Sanoyah Textile', 'urbaine'),
('b329cbfc-10d2-5bfc-b88c-bf94a8c9d4cf', 'Conakry', 'Conakry', 'Sanoyah', 'Sanoyah Rails Plateau', 'urbaine'),
('27c4e691-cb7d-5353-b198-467897cfe315', 'Conakry', 'Conakry', 'Sanoyah', 'Sanoyah Dispensaire', 'urbaine'),
('75bc5f51-9723-554c-ae06-e2bfe5e0e690', 'Conakry', 'Conakry', 'Sanoyah', 'Kountiah Nord', 'urbaine'),
('9d7530bd-d431-5ba4-94ee-8184fe4b0d9e', 'Conakry', 'Conakry', 'Sanoyah', 'CBA Sanoyah', 'urbaine'),
('0ba2f774-0835-5cb2-b3e4-d3132ab54b4e', 'Conakry', 'Conakry', 'Sanoyah', 'Kalokhoya', 'urbaine'),
('9bd21c09-ecf0-5830-adb6-7bdaf414530e', 'Conakry', 'Conakry', 'Sanoyah', 'Sampilyah', 'urbaine'),
-- CONAKRY - Commune Maneah
('c5ce7d97-3c50-54de-aac8-6806be18fa8f', 'Conakry', 'Conakry', 'Maneah', 'Hermakono', 'urbaine'),
('513191a6-7679-5fe6-8cea-4282aedc235f', 'Conakry', 'Conakry', 'Maneah', 'Bambaya', 'urbaine'),
('93754081-bd3e-5244-93c8-77b7b550abbb', 'Conakry', 'Conakry', 'Maneah', 'Kassogna', 'urbaine'),
('f6acde2e-b8da-5da2-82b8-c3d0a689a4be', 'Conakry', 'Conakry', 'Maneah', 'Kakulima', 'urbaine'),
('5438e8e9-e35b-52c6-ba08-df116983ef9c', 'Conakry', 'Conakry', 'Maneah', 'Sombe', 'urbaine'),
('93ade4be-92db-5b39-802a-b81c8474f451', 'Conakry', 'Conakry', 'Maneah', 'Tanene I', 'urbaine'),
('69b5757b-a13c-5b9b-84fb-5d84146d0d7b', 'Conakry', 'Conakry', 'Maneah', 'Tanene II', 'urbaine'),
('658165ec-22b7-5591-a0c2-a25390e64b3b', 'Conakry', 'Conakry', 'Maneah', 'Bentouraya Plateau', 'urbaine'),
('379a6840-acee-5741-9511-d9e97504238d', 'Conakry', 'Conakry', 'Maneah', 'Bentouraya Village', 'urbaine'),
('f52af50d-8b36-5004-8679-bb6f8be694a5', 'Conakry', 'Conakry', 'Maneah', 'Friguiyadi Nord', 'urbaine'),
('ea79b06e-81de-5aee-bc08-b9c1eba4363f', 'Conakry', 'Conakry', 'Maneah', 'Friguiyadi Village', 'rurale'),
('c70f0fec-0537-5af8-a5f6-dd6f61e1e23a', 'Conakry', 'Conakry', 'Maneah', 'Gomboya Nord', 'rurale'),

-- ============================================================================
-- REGION DE KINDIA (5 préfectures : Dubréka, Kindia, Coyah, Forecariah, Télimélé)
-- ============================================================================
-- PREFECTURE DE DUBREKA - Commune Urbaine
('3603bed7-629e-5a54-8ddb-b85e5bc60e12', 'Kindia', 'Dubréka', 'Dubréka Centre', 'Bondabon', 'urbaine'),
('127aa9b3-0e17-5e72-9b6f-b70bbeb0ce90', 'Kindia', 'Dubréka', 'Dubréka Centre', 'Dar-Es-Salam', 'urbaine'),
('d5d6a6df-d5f2-529c-ad85-a8884f92bc13', 'Kindia', 'Dubréka', 'Dubréka Centre', 'Dogbèrè', 'urbaine'),
('d2806c18-e018-5104-a528-9a65f63fc470', 'Kindia', 'Dubréka', 'Dubréka Centre', 'Gbéréyire', 'urbaine'),
('9e991219-7154-5f34-89f5-a6e3cd9b937d', 'Kindia', 'Dubréka', 'Dubréka Centre', 'Kobian', 'urbaine'),
('0d529152-1780-59d9-b19c-dd6db0347793', 'Kindia', 'Dubréka', 'Dubréka Centre', 'Koleyan N''sira', 'urbaine'),
('0440c5dd-e7d1-555f-938a-ef324710beb2', 'Kindia', 'Dubréka', 'Dubréka Centre', 'Mafoudia', 'urbaine'),
('9dac8b73-2e1f-5046-a331-fbc662676bfb', 'Kindia', 'Dubréka', 'Dubréka Centre', 'Négueyah', 'urbaine'),
('077365c4-b088-5c30-838f-81f4365f7d0d', 'Kindia', 'Dubréka', 'Dubréka Centre', 'Simbayah', 'urbaine'),
('0c50fd75-3ae4-5182-8918-8996e4527d48', 'Kindia', 'Dubréka', 'Dubréka Centre', 'Tanéné', 'urbaine'),
('b19e6623-2dee-5183-ba11-38869fec9433', 'Kindia', 'Dubréka', 'Dubréka Centre', 'Tanga', 'urbaine'),
('44e5e2f4-bdb9-555d-ad5e-124875b28e82', 'Kindia', 'Dubréka', 'Dubréka Centre', 'Terset', 'urbaine'),
('3a8e7e82-49a6-5f34-a2bb-81ff0803378e', 'Kindia', 'Dubréka', 'Dubréka Centre', 'Tompetin', 'urbaine'),
('7013a50d-2220-56b6-99c7-1858e63afef2', 'Kindia', 'Dubréka', 'Dubréka Centre', 'Toumaniah', 'urbaine'),
('89b8b3fd-4e4f-5289-a4e3-8382d70aa683', 'Kindia', 'Dubréka', 'Dubréka Centre', 'Yorokogueyah', 'urbaine'),
-- PREFECTURE DE DUBREKA - Communes Rurales
('d7dfa6e7-0b46-5b81-a103-d1bd24eebef2', 'Kindia', 'Dubréka', 'Bady', 'Bady Centre', 'rurale'),
('59c98d3b-e15b-5101-af08-5ae8804854da', 'Kindia', 'Dubréka', 'Falessade', 'Falessade Centre', 'rurale'),
('4e6752f7-c9a0-5557-a085-5bb070bbbf72', 'Kindia', 'Dubréka', 'Khorira', 'Khorira Centre', 'rurale'),
('d37b07ae-7ad0-5086-8244-df248fbbfcac', 'Kindia', 'Dubréka', 'Ouassou', 'Ouassou Centre', 'rurale'),
('705a875d-ae24-5447-bd6d-fe0aa73f59c2', 'Kindia', 'Dubréka', 'Tanene', 'Tanèné Centre', 'rurale'),
('1377d388-c847-5beb-a6df-4c5e150e628d', 'Kindia', 'Dubréka', 'Tondon', 'Tondon Centre', 'rurale'),
-- PREFECTURE DE KINDIA - Commune Urbaine
('603bad44-fb21-50b8-a91f-e54d77ca351b', 'Kindia', 'Kindia', 'Kindia Centre', 'Gangan', 'urbaine'),
('8533ccaa-e55c-5b6f-bfbb-0e67af527ec5', 'Kindia', 'Kindia', 'Kindia Centre', 'Sambaya', 'urbaine'),
('0c2485be-9502-50d8-a9b9-70ef833ed42a', 'Kindia', 'Kindia', 'Kindia Centre', 'Koliady I', 'urbaine'),
('003c5d48-ca9f-5824-bcd5-93b062c87be0', 'Kindia', 'Kindia', 'Kindia Centre', 'Koliady II', 'urbaine'),
('161d8db5-068e-51ac-9a11-3c7a0b049364', 'Kindia', 'Kindia', 'Kindia Centre', 'Kénindé', 'urbaine'),
('7acd6167-fe42-5975-ab7e-41e1df41d3d4', 'Kindia', 'Kindia', 'Kindia Centre', 'Kindia-Gare', 'urbaine'),
('eed954b4-f5a0-5591-b835-00d0f753c399', 'Kindia', 'Kindia', 'Kindia Centre', 'Sinaniya', 'urbaine'),
('137a5713-efec-54c7-b8c2-757d49232849', 'Kindia', 'Kindia', 'Kindia Centre', 'Condetta I', 'urbaine'),
('8b9c23c3-860d-5fa1-bea1-84986a2bcfed', 'Kindia', 'Kindia', 'Kindia Centre', 'Condetta II', 'urbaine'),
('8a47f63c-6fd3-52b6-92c1-556f9296f32e', 'Kindia', 'Kindia', 'Kindia Centre', 'Condetta III', 'urbaine'),
('df3db569-6b1b-5d99-8547-ae06c8e14b4c', 'Kindia', 'Kindia', 'Kindia Centre', 'Banlieue', 'urbaine'),
('519964b6-d245-5171-b5e9-440d1e9b63f1', 'Kindia', 'Kindia', 'Kindia Centre', 'Cacia', 'urbaine'),
('d68147c1-73b1-5a11-a5f3-8d564f1cea5e', 'Kindia', 'Kindia', 'Kindia Centre', 'Abattoir', 'urbaine'),
('887aee29-e249-5458-bee5-ff36486891e4', 'Kindia', 'Kindia', 'Kindia Centre', 'Manquepas', 'urbaine'),
('06083bcf-29b2-57ac-b478-3d7c9135ad68', 'Kindia', 'Kindia', 'Kindia Centre', 'Yeole', 'urbaine'),
('d8186765-d299-59e7-92f5-5a41c8a64a02', 'Kindia', 'Kindia', 'Kindia Centre', 'Thierno Djibya', 'urbaine'),
('a1672215-cae7-5b82-bf0c-efd9ca8bd1bf', 'Kindia', 'Kindia', 'Kindia Centre', 'Tafory', 'urbaine'),
('6c28e8cc-e8a3-5cd0-a18a-402300d3721f', 'Kindia', 'Kindia', 'Kindia Centre', 'Sarakholeya', 'urbaine'),
('dde6796b-b3ff-596d-80f4-731841415f4b', 'Kindia', 'Kindia', 'Kindia Centre', 'Ferefou', 'urbaine'),
('8c47c8af-fc54-581f-90d0-8014b2c1dfba', 'Kindia', 'Kindia', 'Kindia Centre', 'Gadawawa', 'urbaine'),
('68157458-7b56-58ab-b5b3-7ed94fa98472', 'Kindia', 'Kindia', 'Kindia Centre', 'Caravanserail', 'urbaine'),
('5e0b5ac3-c56a-5662-af8e-6c6c16d57710', 'Kindia', 'Kindia', 'Kindia Centre', 'Wondy', 'urbaine'),
('a815584c-5e02-58b0-bc62-5ef6654a22e3', 'Kindia', 'Kindia', 'Kindia Centre', 'Fissa', 'urbaine'),
('bed57893-88ef-52ab-8965-609ee25a4e89', 'Kindia', 'Kindia', 'Kindia Centre', 'Kolia', 'urbaine'),
('0ba8392c-2c74-5953-80bb-a50f978f7106', 'Kindia', 'Kindia', 'Kindia Centre', 'Tapyauka', 'urbaine'),
('94b428c9-d526-531b-b023-d3cc5bc6a86e', 'Kindia', 'Kindia', 'Kindia Centre', 'Mangoya', 'urbaine'),
('6b4459e5-297e-54ad-92ea-a400fc7ec6de', 'Kindia', 'Kindia', 'Kindia Centre', 'Segueyah', 'urbaine'),
('f6881965-f449-55e7-a123-c59dcbf7e2b4', 'Kindia', 'Kindia', 'Kindia Centre', 'Kombitide', 'urbaine'),
('9f7d52b5-dd37-52d8-bc21-af2da459421e', 'Kindia', 'Kindia', 'Kindia Centre', 'Parc de Koukou', 'urbaine'),
('40a9d717-3fb8-54c3-83d2-bda4b7c08214', 'Kindia', 'Kindia', 'Kindia Centre', 'Tafory Meteo', 'urbaine'),
-- PREFECTURE DE KINDIA - Communes Rurales
('577a267c-44a2-5429-9187-d3249f509820', 'Kindia', 'Kindia', 'Bangouyah', 'Bangouyah Centre', 'rurale'),
('201e176e-2776-51e0-ba71-98822db62e77', 'Kindia', 'Kindia', 'Damakania', 'Damakania Centre', 'rurale'),
('4d5577c8-93f5-5530-a344-c71b3f939ad1', 'Kindia', 'Kindia', 'Friguiagbe', 'Friguiagbe Centre', 'rurale'),
('6ecde34a-9e8e-541a-af64-9026292553fc', 'Kindia', 'Kindia', 'Kolente', 'Kolente Centre', 'rurale'),
('2b020969-84a4-5f24-a4b6-e5407a926ecb', 'Kindia', 'Kindia', 'Linsan', 'Linsan Centre', 'rurale'),
('2328d745-3bc4-552a-bd54-a898b992da5f', 'Kindia', 'Kindia', 'Madina Oula', 'Madina Oula Centre', 'rurale'),
('2590bba7-7bbe-555f-b54f-af47d6f8b7e1', 'Kindia', 'Kindia', 'Mambia', 'Mambia Centre', 'rurale'),
('d1cd9859-a278-530c-91b0-6714f70cc6bc', 'Kindia', 'Kindia', 'Molota', 'Molota Centre', 'rurale'),
('efd50180-d57d-5efd-9433-f32351a6d200', 'Kindia', 'Kindia', 'Samayah', 'Samayah Centre', 'rurale'),
('d2c9ceb8-04fe-5b7b-bc14-4a8e8f35664c', 'Kindia', 'Kindia', 'Sougueta', 'Sougueta Centre', 'rurale'),
-- PREFECTURE DE COYAH - Commune Urbaine
('44f5f86e-8c59-52c3-9763-ca66b9cdf171', 'Kindia', 'Coyah', 'Coyah Centre', 'Somayah Mosquée', 'urbaine'),
('e0e5e9ac-3a6a-52f5-a58d-12ed8a92797f', 'Kindia', 'Coyah', 'Coyah Centre', 'Somayah Plateau', 'urbaine'),
('d1233fb9-7168-56a6-a068-425e294dcdc6', 'Kindia', 'Coyah', 'Coyah Centre', 'Somayah Centre', 'urbaine'),
('a9dc1b6c-70f9-52f2-b642-fb178afadd8d', 'Kindia', 'Coyah', 'Coyah Centre', 'Nakiri', 'urbaine'),
('9014940e-781d-5ad9-a000-512b8588004a', 'Kindia', 'Coyah', 'Coyah Centre', 'Labo', 'urbaine'),
('ac22ccc6-5ed0-56ef-9b8d-ad98456cf745', 'Kindia', 'Coyah', 'Coyah Centre', 'Nord 1', 'urbaine'),
('41c7c678-5517-5f86-9908-930940289565', 'Kindia', 'Coyah', 'Coyah Centre', 'Nord 2', 'urbaine'),
('e4bfcdb7-4df3-5724-9ec4-901ee345141c', 'Kindia', 'Coyah', 'Coyah Centre', 'Coyah Centre', 'urbaine'),
('7b4f1d15-e531-5257-93fe-d4ed97489184', 'Kindia', 'Coyah', 'Coyah Centre', 'Fily 1', 'urbaine'),
('d2503063-aca2-5441-b7b7-a9fa3a2a1215', 'Kindia', 'Coyah', 'Coyah Centre', 'Fily 2', 'urbaine'),
('0ed52b2b-22dd-5a24-adcb-a065272aab3a', 'Kindia', 'Coyah', 'Coyah Centre', 'Km 54', 'urbaine'),
('3026d72c-6420-5105-adfd-e4b34cadbd2e', 'Kindia', 'Coyah', 'Coyah Centre', 'Karouba Tougandi', 'urbaine'),
('93cb6321-272d-5214-91e1-3ec69c97c362', 'Kindia', 'Coyah', 'Coyah Centre', 'Laminaya Batouya', 'urbaine'),
('a410eea9-5a2d-5a6c-8c9b-72bb2ee4ea7f', 'Kindia', 'Coyah', 'Coyah Centre', 'Doumbouyah Centre', 'urbaine'),
('6d6a79d3-d640-59e6-bc8e-3f2f4070932f', 'Kindia', 'Coyah', 'Coyah Centre', 'Doumbouyah Ecole', 'urbaine'),
-- PREFECTURE DE COYAH - Communes Rurales

('075b9794-9ba9-51ab-9866-746bc66b19f4', 'Kindia', 'Coyah', 'Kouriah', 'Bangouyah', 'rurale'),
('340466ad-bbb2-5630-87db-91d584fb5763', 'Kindia', 'Coyah', 'Kouriah', 'Kolikhoure', 'rurale'),
('b3d0d1ba-cf3b-534d-b790-05d9c23fe9e1', 'Kindia', 'Coyah', 'Kouriah', 'Goleah', 'rurale'),
('9086b437-c997-5443-aec1-9942b3de3fca', 'Kindia', 'Coyah', 'Kouriah', 'Koba', 'rurale'),
('c06b8261-0c86-54fb-8c95-b1d2ee747b99', 'Kindia', 'Coyah', 'Kouriah', 'Kouria Centre', 'rurale'),
('18514304-cb8e-5583-8b4a-94ef25303b1f', 'Kindia', 'Coyah', 'Kouriah', 'Moriakhory', 'rurale'),
('f0e8871e-ff32-5ea6-8a12-6347e2ce3359', 'Kindia', 'Coyah', 'Kouriah', 'Tabily', 'rurale'),
('f4bbf476-340a-56c0-b3e6-664fbdfa476d', 'Kindia', 'Coyah', 'Kouriah', 'Tanene Fribade', 'rurale'),
('5dc282c9-83ef-5347-bea0-7eac2ea4f9c9', 'Kindia', 'Coyah', 'Wonkifong', 'Lefourédakha', 'rurale'),
('c2dce9cd-2c4d-5b76-8b0d-171fdd3a4ab3', 'Kindia', 'Coyah', 'Wonkifong', 'Km 55', 'rurale'),
('bd5b3caa-d158-5f15-b849-787bcfdbcca2', 'Kindia', 'Coyah', 'Wonkifong', 'Wonkifong Carrefour', 'rurale'),
('f05fe125-0267-57c3-8ed8-7a267d78c3d7', 'Kindia', 'Coyah', 'Wonkifong', 'Boundayah', 'rurale'),
('c6f15393-ee0d-5610-93f9-48ff7f1c2c5e', 'Kindia', 'Coyah', 'Wonkifong', 'Balamodia', 'rurale'),
('fbb94424-2245-597b-bcaf-3c1f43238850', 'Kindia', 'Coyah', 'Wonkifong', 'Doneah', 'rurale'),
('9ca6e203-cbe2-5599-8d2a-922af3eb716f', 'Kindia', 'Coyah', 'Wonkifong', 'Balayay', 'rurale'),
('a9d568a4-c234-5d91-9473-73cecc7a7918', 'Kindia', 'Coyah', 'Wonkifong', 'Bonfet', 'rurale'),
('4af6651c-a723-53cc-8bec-fe09fff3b2ff', 'Kindia', 'Coyah', 'Wonkifong', 'Kendoumayah', 'rurale'),
('7e9c83c5-f491-5c3a-85bf-06f466de5f2e', 'Kindia', 'Coyah', 'Wonkifong', 'Kouyeyah', 'rurale'),
('239f47e8-4518-5b2a-981e-ed8ddf2c2e90', 'Kindia', 'Coyah', 'Wonkifong', 'Kiriah', 'rurale'),
('9cc0684e-bac2-5652-9a48-ac17109a8048', 'Kindia', 'Coyah', 'Wonkifong', 'Kounsouta', 'rurale'),
('0920f569-3cc6-5459-91f0-052ec1058acd', 'Kindia', 'Coyah', 'Wonkifong', 'Laminayah 970', 'rurale'),
('ce18f1db-e48f-5f6b-b030-fc660244b775', 'Kindia', 'Coyah', 'Wonkifong', 'Tambayah', 'rurale'),
('c209791c-079a-5055-b918-8cf8c381f031', 'Kindia', 'Coyah', 'Wonkifong', 'Mangata', 'rurale'),
('58a61d83-61d9-5859-8630-4eb6c81e8d3a', 'Kindia', 'Coyah', 'Wonkifong', 'Nasser', 'rurale'),
('6ae9af57-d99d-5202-8f3e-16df85433960', 'Kindia', 'Coyah', 'Wonkifong', 'Toguiron', 'rurale'),
('fbd1c862-0177-5770-a25d-5d91f3c3cb03', 'Kindia', 'Coyah', 'Wonkifong', 'Wonkifong Centre', 'rurale'),
('bf297cbb-bd08-5fd6-a214-525409d1f90c', 'Kindia', 'Coyah', 'Wonkifong', 'Yenguiakhory', 'rurale'),

-- PREFECTURE DE FORECARIAH - Commune Urbaine
('7288d295-15c3-5259-9389-5e9ade5be36d', 'Kindia', 'Forecariah', 'Forecariah Centre', 'Forecariah Centre Ville', 'urbaine'),
('827dfc6b-623f-53ba-822b-04a2c2facab9', 'Kindia', 'Forecariah', 'Forecariah Centre', 'Madina Forecariah', 'urbaine'),
('407b7ead-4ba5-59e4-b478-629cb1e6b185', 'Kindia', 'Forecariah', 'Forecariah Centre', 'Tankia', 'urbaine'),
('6cf9020c-ea03-5a5d-82b5-2e9de30d9a45', 'Kindia', 'Forecariah', 'Forecariah Centre', 'Kakossa Route', 'urbaine'),
('1cd67d13-2885-527d-890b-c7ef92929f36', 'Kindia', 'Forecariah', 'Forecariah Centre', 'Gare Forecariah', 'urbaine'),
('f5cb457f-a665-5736-86fd-160139c758bc', 'Kindia', 'Forecariah', 'Forecariah Centre', 'Wonde', 'urbaine'),
('4b39abb6-1e92-57dc-b607-4e0f62255505', 'Kindia', 'Forecariah', 'Forecariah Centre', 'Soumbouyah', 'urbaine'),
('3448d7af-788a-56b5-974d-ba1217cdf735', 'Kindia', 'Forecariah', 'Forecariah Centre', 'Bangouyah Forecariah', 'urbaine'),
-- PREFECTURE DE FORECARIAH - Communes Rurales
('9ef5626a-67c3-5fc9-bc6a-fe8591874f1c', 'Kindia', 'Forecariah', 'Alassoyah', 'Alassoyah Centre', 'rurale'),
('1d961dcf-e2a3-53ea-98ff-0d87869ea413', 'Kindia', 'Forecariah', 'Benty', 'Benty Centre', 'rurale'),
('6264abaf-0c1e-5c4d-ad67-9f68aa1aea81', 'Kindia', 'Forecariah', 'Farmoriah', 'Farmoriah Centre', 'rurale'),
('1ba77561-9784-525a-9a1b-2f7252965e1b', 'Kindia', 'Forecariah', 'Kaback', 'Kaback Centre', 'rurale'),
('7c3e462d-b459-537c-aa46-060621f3d1d6', 'Kindia', 'Forecariah', 'Kakossa', 'Kakossa Centre', 'rurale'),
('945dbab0-d668-5061-b355-8ea920103b91', 'Kindia', 'Forecariah', 'Kalliah', 'Kalliah Centre', 'rurale'),
('c5285cf0-c1ca-532c-bf2a-b900e90bbf68', 'Kindia', 'Forecariah', 'Maferinyah', 'Maferinyah Centre', 'rurale'),
('6c1328a5-269e-5540-918c-7e2cbb7778f2', 'Kindia', 'Forecariah', 'Moussayah', 'Moussayah Centre', 'rurale'),
('1013c03b-958e-5129-8819-eddd15b94fd5', 'Kindia', 'Forecariah', 'Sikhourou', 'Sikhourou Centre', 'rurale'),
('e87120e3-8dce-59d2-bd05-bb42584770f2', 'Kindia', 'Forecariah', 'Moribayah', 'Moribayah Centre', 'rurale'),
-- PREFECTURE DE Télimélé - Commune Urbaine
('6fa74d06-53e6-5e2b-9738-418edab3c05f', 'Kindia', 'Télimélé', 'Télimélé Centre', 'Télimélé Centre Ville', 'urbaine'),
('ee907e6f-4377-525c-b67d-6e40d75564f6', 'Kindia', 'Télimélé', 'Télimélé Centre', 'Madina Télimélé', 'urbaine'),
('a2805eff-775a-5c4c-bb57-cf1e21eaba03', 'Kindia', 'Télimélé', 'Télimélé Centre', 'Gare Télimélé', 'urbaine'),
('f9009477-e180-5411-a8d2-3b8bc6a34719', 'Kindia', 'Télimélé', 'Télimélé Centre', 'Hafia Télimélé', 'urbaine'),
('ebcafea9-5e72-5ad2-b643-ac4df33c1bdf', 'Kindia', 'Télimélé', 'Télimélé Centre', 'Sangoyah Télimélé', 'urbaine'),
('d94efb58-d928-5673-a1d8-5d79f36b0b27', 'Kindia', 'Télimélé', 'Télimélé Centre', 'Koliady Télimélé', 'urbaine'),
('03ac0668-935c-538f-9228-7bdfcd6d1189', 'Kindia', 'Télimélé', 'Télimélé Centre', 'Wondy Télimélé', 'urbaine'),
-- PREFECTURE DE Télimélé - Communes Rurales
('ffcc4704-8bf2-52c7-bed0-a75b9827f742', 'Kindia', 'Télimélé', 'Bourouwal', 'Bourouwal Centre', 'rurale'),
('1ec8b160-2570-5e31-81d3-2d4e5c14ed6e', 'Kindia', 'Télimélé', 'Daramagnaky', 'Daramagnaky Centre', 'rurale'),
('e25ad19c-1d0c-5a14-a6b0-832f57f65b8c', 'Kindia', 'Télimélé', 'Gououdje', 'Gououdje Centre', 'rurale'),
('7f7dac81-09ab-515d-8876-df5dbf487229', 'Kindia', 'Télimélé', 'Koba', 'Koba Centre', 'rurale'),
('8fbeab77-fcaa-50e0-972b-5db703cbe742', 'Kindia', 'Télimélé', 'Kollet', 'Kollet Centre', 'rurale'),
('f86dba8f-f976-524f-9842-3c4ef4d3e7c1', 'Kindia', 'Télimélé', 'Kosotamy', 'Kosotamy Centre', 'rurale'),
('510c15b1-c1ce-56dc-83e7-c76e1873c5cf', 'Kindia', 'Télimélé', 'Missira', 'Missira Centre', 'rurale'),
('8f48ec26-eccd-5731-ba75-2d3a8017642b', 'Kindia', 'Télimélé', 'Santou', 'Santou Centre', 'rurale'),
('f4f4a1ea-b94f-5975-8d73-3f87033912b7', 'Kindia', 'Télimélé', 'Sarekaly', 'Sarekaly Centre', 'rurale'),
('597cd4bd-75fc-5587-87bb-081ada262b48', 'Kindia', 'Télimélé', 'Sinta', 'Sinta Centre', 'rurale'),
('a1bcbb4e-9c9b-5dbc-b384-635798bd9744', 'Kindia', 'Télimélé', 'Sogolon', 'Sogolon Centre', 'rurale'),
('f600b193-ac54-5281-bc14-27c81c9b69fe', 'Kindia', 'Télimélé', 'Tarihoye', 'Tarihoye Centre', 'rurale'),
('70d18878-0e0e-5f61-b82a-60ef73491899', 'Kindia', 'Télimélé', 'Thionthian', 'Thionthian Centre', 'rurale'),
('abcf49f8-b456-5ce9-9b25-33f7e7d2de89', 'Kindia', 'Télimélé', 'Kawessi', 'Kawessi Centre', 'rurale'),

-- REGION DE KANKAN - Prefecture Kankan - Commune Urbaine

('c27a0a5d-3e4a-5a5d-bc89-53096c265114', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Aviation', 'urbaine'),
('462ad174-9dd3-5f0a-9bb6-3434a928264e', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Farako 1', 'urbaine'),
('792cb843-d365-55a3-8db2-314eb70d0748', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Farako 2', 'urbaine'),
('9c6be4bd-b967-5f98-b77f-eefe27fdd4e5', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Kabada 1', 'urbaine'),
('3a63f823-12dc-5fa6-9607-1d3bc1e0aeca', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Kabada 2', 'urbaine'),
('ec4c2ab9-e676-5384-ae92-174325ce942d', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Missira', 'urbaine'),
('27b991d7-ed39-591e-89f0-89c019324cc7', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Sogbe', 'urbaine'),
('90b479ca-8f78-5d3f-9f36-d4d8ac89e2c7', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Senkefara 1', 'urbaine'),
('1c6116e6-615d-55cf-b697-3aedd609dcbf', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Senkefara 2', 'urbaine'),
('f79d1abc-4ec3-55a8-a97c-a4bce839efcf', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Dalaco', 'urbaine'),
('aa37797c-8453-5800-bb07-dbc8757557fe', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Madina', 'urbaine'),
('3390e8c3-3846-5358-8ca6-6a9fc244b8b7', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Meteo', 'urbaine'),
('7815b07b-829f-5da6-8705-d21f43c472ca', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Timbo', 'urbaine'),
('f590adf4-82d5-57b1-8944-c75eb76e5329', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Banankoroda', 'urbaine'),
('8b607859-bd9b-5dcb-97b2-d880f16fa4fb', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Energie', 'urbaine'),
('8d0f59b8-35f1-513a-b0dd-70a115572989', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Korialen', 'urbaine'),
('b10d5d22-6f2f-5467-9f41-2af690f94900', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Salamani', 'urbaine'),
('d8b2137f-bbdf-596f-877e-e3736aae08f1', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Konkoninkoro', 'urbaine'),
('8621659d-6836-552d-9cd9-c993217cd86b', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Fourban', 'urbaine'),
('1ff42f2d-c269-5557-8829-0058b70a9d8a', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Djodon', 'urbaine'),
('a314a5b6-097d-5d56-b265-0bb1c8ed8aad', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Kankancoura', 'urbaine'),
('1e8bb190-a142-563d-a4bb-b56b3b11bc99', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Bordo', 'urbaine'),
('2ceeed91-845e-5563-a5de-e16f52cc563b', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Briqueterie', 'urbaine'),
('d9acfa86-8043-5de9-a2ef-648a7ea0a3d6', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Gare', 'urbaine'),
('1be7324e-fce0-5c3e-a435-552e45657300', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Dar Es Salam', 'urbaine'),
('7ee52c8b-84e5-5e97-8ad1-153a65d37a8a', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Hermakono 1', 'urbaine'),
('7e29badc-caa7-570f-98b1-c38be2de41e8', 'Kankan', 'Kankan', 'Kankan Nabaya', 'Hermakono 2', 'urbaine'),

-- REGION DE KANKAN - Prefecture Kankan - Communes Rurales

('cc116aec-7f26-5c3c-bf21-9991415a9a74', 'Kankan', 'Kankan', 'Balandougou', 'Balandougou Centre', 'rurale'),
('ed7a2589-295a-507c-a32f-264042541147', 'Kankan', 'Kankan', 'Bate-Nafadji', 'Bate-Nafadji Centre', 'rurale'),
('bc51b04d-a24b-5500-adc4-4e61290a55d1', 'Kankan', 'Kankan', 'Boula', 'Boula Centre', 'rurale'),
('6cf38349-cd07-525b-8758-f7aaf43a9d11', 'Kankan', 'Kankan', 'Gberedou-Baranama', 'Gberedou-Baranama Centre', 'rurale'),
('38a2cc68-209c-5aa4-a708-e5638f131447', 'Kankan', 'Kankan', 'Karifamoriyah', 'Karifamoriyah Centre', 'rurale'),
('f001de9e-d859-57fd-8a1b-80689c5dd156', 'Kankan', 'Kankan', 'Koumban', 'Koumban Centre', 'rurale'),
('94eea032-d99f-570e-ae5a-eac7b64bbd95', 'Kankan', 'Kankan', 'Mamouroudou', 'Mamouroudou Centre', 'rurale'),
('a806857c-d2ba-5116-8ace-794acb07bc21', 'Kankan', 'Kankan', 'Missamana', 'Missamana Centre', 'rurale'),
('8ca5c76b-e530-5c2b-8aac-46a88834fa7d', 'Kankan', 'Kankan', 'Moribayah', 'Moribayah Centre', 'rurale'),
('eed15329-7f37-54e7-b954-209a7478545d', 'Kankan', 'Kankan', 'Sabadou-Baranama', 'Sabadou-Baranama Centre', 'rurale'),
('e64b8d33-4b57-519f-91f1-649d97804994', 'Kankan', 'Kankan', 'Tinti-Oulen', 'Tinti-Oulen Centre', 'rurale'),
('c508caa7-cd9b-5e24-807c-fd75c77524b7', 'Kankan', 'Kankan', 'Tokounou', 'Tokounou Centre', 'rurale'),
('59479ca5-c11e-5808-946d-432ecfad25bf', 'Kankan', 'Kankan', 'Djelibakoro', 'Djelibakoro Centre', 'rurale'),
('9374ec8a-1f15-58b9-918d-db893e453b4a', 'Kankan', 'Kankan', 'Fodecariah-Badimana', 'Fodecariah-Badimana Centre', 'rurale'),
('a69d56b9-9a1d-5750-813f-3b24d45799de', 'Kankan', 'Kankan', 'Djimbala', 'Djimbala Centre', 'rurale'),

-- REGION DE KANKAN - Prefecture Kerouane - Commune Urbaine

('34e8f625-6c58-58d8-9d89-f555474979ab', 'Kankan', 'Kerouane', 'Kerouane Centre', 'Kerouane Centre Ville', 'urbaine'),

-- REGION DE KANKAN - Prefecture Kerouane - Communes Rurales

('fb0283a4-d85b-55c1-8836-38b785d2030c', 'Kankan', 'Kerouane', 'Banankoro', 'Banankoro Centre', 'rurale'),
('beac1783-0b77-52b8-8665-6daba898f5b2', 'Kankan', 'Kerouane', 'Damaro', 'Damaro Centre', 'rurale'),
('ea3540be-c3ef-5865-add1-61b2acba0fe9', 'Kankan', 'Kerouane', 'Komodou', 'Komodou Centre', 'rurale'),
('efbdcb5e-86c0-5a02-b190-d3bdeacc5949', 'Kankan', 'Kerouane', 'Kounsankoro', 'Kounsankoro Centre', 'rurale'),
('aa91008a-9d20-57c8-bd4e-58dd9e41962d', 'Kankan', 'Kerouane', 'Linko', 'Linko Centre', 'rurale'),
('00bf72d4-9a0b-5c82-8f69-5d6f06c81eff', 'Kankan', 'Kerouane', 'Sibiribaro', 'Sibiribaro Centre', 'rurale'),
('32081c77-326c-576d-840f-67f8598d9217', 'Kankan', 'Kerouane', 'Soromaya', 'Soromaya Centre', 'rurale'),

-- REGION DE KANKAN - Prefecture Kouroussa - Commune Urbaine

('6574f9ac-29b5-52e9-ba2e-6756471fdbd0', 'Kankan', 'Kouroussa', 'Kouroussa Centre', 'Kouroussa Centre Ville', 'urbaine'),

-- REGION DE KANKAN - Prefecture Kouroussa - Communes Rurales

('f5692d07-3a5a-5536-99e2-72b20b0fe141', 'Kankan', 'Kouroussa', 'Babila', 'Babila Centre', 'rurale'),
('75ab13f6-31fe-5958-92ce-65d9062332d4', 'Kankan', 'Kouroussa', 'Balato', 'Balato Centre', 'rurale'),
('430a9e55-a17e-5060-a05c-1ca54177b20a', 'Kankan', 'Kouroussa', 'Banfele', 'Banfele Centre', 'rurale'),
('eb5efe90-b1a8-5b3a-8da7-989bffab669c', 'Kankan', 'Kouroussa', 'Baro', 'Baro Centre', 'rurale'),
('c06d411c-5f9f-5382-82d3-d0d301023cec', 'Kankan', 'Kouroussa', 'Cissela', 'Cissela Centre', 'rurale'),
('23927460-3488-502f-9fa1-6893071785f9', 'Kankan', 'Kouroussa', 'Douako', 'Douako Centre', 'rurale'),
('9c8c8110-0b88-5af6-88a1-9c241847e23a', 'Kankan', 'Kouroussa', 'Doura', 'Doura Centre', 'rurale'),
('07c8e2aa-354a-5168-a46b-8c5371b8d5c8', 'Kankan', 'Kouroussa', 'Kiniero', 'Kiniero Centre', 'rurale'),
('ce240afe-50f9-58e4-a48f-5af732d60144', 'Kankan', 'Kouroussa', 'Komola-Koura', 'Komola-Koura Centre', 'rurale'),
('f6c79160-97b8-519d-a82b-fe9cb9bea7ed', 'Kankan', 'Kouroussa', 'Koumana', 'Koumana Centre', 'rurale'),
('03c24c18-3e82-529f-a0cb-78dc5072042b', 'Kankan', 'Kouroussa', 'Sanguiana', 'Sanguiana Centre', 'rurale'),
('6b35ac99-f67f-5e20-bbd0-2fede11688c1', 'Kankan', 'Kouroussa', 'Fadou-Saba', 'Fadou-Saba Centre', 'rurale'),
('2556b7f3-5b2a-5085-9f4e-b6e67779feac', 'Kankan', 'Kouroussa', 'Kouroukoro', 'Kouroukoro Centre', 'rurale'),
('de73a919-15b0-51a3-99c2-5e5b6fd4292d', 'Kankan', 'Kouroussa', 'Kansereyah', 'Kansereyah Centre', 'rurale'),

-- REGION DE KANKAN - Prefecture Mandiana - Commune Urbaine

('48aab364-b8d6-5fd1-a8e3-31fc2ed312f7', 'Kankan', 'Mandiana', 'Mandiana Centre', 'Mandiana Centre Ville', 'urbaine'),

-- REGION DE KANKAN - Prefecture Mandiana - Communes Rurales

('44b66937-fb6d-54aa-b51c-800630eb6041', 'Kankan', 'Mandiana', 'Balandougouba', 'Balandougouba Centre', 'rurale'),
('4a981a09-a149-5686-87fc-e4adab31a9e4', 'Kankan', 'Mandiana', 'Dialakoro', 'Dialakoro Centre', 'rurale'),
('68b5b75d-cb46-553f-80eb-0339d79db384', 'Kankan', 'Mandiana', 'Faralako', 'Faralako Centre', 'rurale'),
('91f9edd8-fa33-54da-9124-3012ac7b6712', 'Kankan', 'Mandiana', 'Kantoumanina', 'Kantoumanina Centre', 'rurale'),
('d4e35a60-9ea1-511f-8680-4d48b4bd2a9a', 'Kankan', 'Mandiana', 'Kinieran', 'Kinieran Centre', 'rurale'),
('184cc2ad-0dc1-5c02-a3fc-3e9fb2c5422a', 'Kankan', 'Mandiana', 'Kondianakoro', 'Kondianakoro Centre', 'rurale'),
('db27a4b4-2a82-554c-90ef-86fb5f7aa31e', 'Kankan', 'Mandiana', 'Koundian', 'Koundian Centre', 'rurale'),
('d29a1c8e-0c2c-501c-a93c-eb69c4440dda', 'Kankan', 'Mandiana', 'Morodou', 'Morodou Centre', 'rurale'),
('58d6c834-b128-5293-93d9-0859983c03c9', 'Kankan', 'Mandiana', 'Niantanina', 'Niantanina Centre', 'rurale'),
('6e238dae-06a8-56bc-a9bf-99f644fcdff8', 'Kankan', 'Mandiana', 'Saladou', 'Saladou Centre', 'rurale'),
('30d0a5b6-1a14-5139-b7ab-baf580731bf7', 'Kankan', 'Mandiana', 'Sansando', 'Sansando Centre', 'rurale'),
('643c81cd-6a5e-5dda-85de-f3dfbc462ca0', 'Kankan', 'Mandiana', 'Kodiaran', 'Kodiaran Centre', 'rurale'),

-- REGION DE KANKAN - Prefecture Siguiri - Commune Urbaine

('fc79fa3f-5c69-5e4b-8e93-9696260846f3', 'Kankan', 'Siguiri', 'Siguiri Centre', 'Siguiri Centre Ville', 'urbaine'),

-- REGION DE KANKAN - Prefecture Siguiri - Communes Rurales

('81ad8558-f59a-5f51-b540-dfa16d46f943', 'Kankan', 'Siguiri', 'Banko', 'Banko Centre', 'rurale'),
('9600de4a-70bf-5d66-8628-27a63ad619fc', 'Kankan', 'Siguiri', 'Doko', 'Doko Centre', 'rurale'),
('c3bd7511-abe5-5e84-93ec-c4f90f2f81d7', 'Kankan', 'Siguiri', 'Faranwalia', 'Faranwalia Centre', 'rurale'),
('837b65d5-3ef6-5eec-b580-f00e0f3f85f6', 'Kankan', 'Siguiri', 'Kiniebakoura', 'Kiniebakoura Centre', 'rurale'),
('6a8295df-9140-58d3-a871-540104f6f2e7', 'Kankan', 'Siguiri', 'Kintinian', 'Kintinian Centre', 'rurale'),
('452958f8-1142-5bf8-802f-bbf4d31a267f', 'Kankan', 'Siguiri', 'Maleah', 'Maleah Centre', 'rurale'),
('2249a0c8-aedc-5c92-87b6-1e81ca88c0cd', 'Kankan', 'Siguiri', 'Naboun', 'Naboun Centre', 'rurale'),
('05c7dc99-1988-5064-90e1-161ecc5c8d05', 'Kankan', 'Siguiri', 'Niagossola', 'Niagossola Centre', 'rurale'),
('b0a76f60-f0a4-5822-8dd0-6c7606b91dfb', 'Kankan', 'Siguiri', 'Niandankoro', 'Niandankoro Centre', 'rurale'),
('6a06a49a-87a7-5d46-9d26-a1e3de1364ef', 'Kankan', 'Siguiri', 'Norassoba', 'Norassoba Centre', 'rurale'),
('9d4d8990-2629-538a-9257-6864ea7fd33d', 'Kankan', 'Siguiri', 'Nounkounkan', 'Nounkounkan Centre', 'rurale'),
('fbc2b1d1-0b2e-5cac-adae-936535434007', 'Kankan', 'Siguiri', 'Siguirini', 'Siguirini Centre', 'rurale'),
('acd9995b-0833-526d-ac61-1013390cd292', 'Kankan', 'Siguiri', 'Didi', 'Didi Centre', 'rurale'),
('94efad15-dfa0-5910-9e56-f1fe792375de', 'Kankan', 'Siguiri', 'Kouremale', 'Kouremale Centre', 'rurale'),
('0a86d788-efab-50d1-b507-dbdea298a701', 'Kankan', 'Siguiri', 'Tomba-Kanssa', 'Tomba-Kanssa Centre', 'rurale'),
('4e665245-2b1b-5dee-b42c-221aad3ebfaf', 'Kankan', 'Siguiri', 'Tomboni', 'Tomboni Centre', 'rurale'),
('6aac8ad4-52e9-5c9b-b2ca-9d7cdd7d1306', 'Kankan', 'Siguiri', 'Fidako', 'Fidako Centre', 'rurale'),
('c85d0255-2bd8-53e7-9925-31b88fb3ca92', 'Kankan', 'Siguiri', 'Diomabana', 'Diomabana Centre', 'rurale'),
('ffd1dbf0-8c83-59ac-bccc-323e46c8cde9', 'Kankan', 'Siguiri', 'Mignada', 'Mignada Centre', 'rurale'),
('cb971b0c-fdb9-55be-9a97-5fa4cbd27888', 'Kankan', 'Siguiri', 'Koumandjambougou', 'Koumandjambougou Centre', 'rurale'),

-- REGION DE N''Zérékoré - Prefecture N''Zérékoré - Commune Urbaine
('f20764ef-9485-519c-94e3-989bd95f0f21', 'N''Zérékoré', 'N''Zérékoré', 'N''Zérékoré Centre', 'Gonia 3', 'urbaine'),
('d53be38d-131e-5862-a87b-99424ff6c1af', 'N''Zérékoré', 'N''Zérékoré', 'N''Zérékoré Centre', 'Nakoyakpala', 'urbaine'),
('53ce1f5f-95d6-514f-aa09-97dc1f0ace45', 'N''Zérékoré', 'N''Zérékoré', 'N''Zérékoré Centre', 'Wessoua', 'urbaine'),
('3fb95d9a-95f3-55fe-bf02-f13384a8da88', 'N''Zérékoré', 'N''Zérékoré', 'N''Zérékoré Centre', 'Horoya 1', 'urbaine'),
('6e32b815-0213-5cd2-b2a7-e18cef7556a0', 'N''Zérékoré', 'N''Zérékoré', 'N''Zérékoré Centre', 'Nyean 1', 'urbaine'),
('dc90fae2-3a42-5ba0-8c68-427f19301b66', 'N''Zérékoré', 'N''Zérékoré', 'N''Zérékoré Centre', 'Kweleyeba', 'urbaine'),
('4ef1dccd-866a-5fed-a89f-925cd1436306', 'N''Zérékoré', 'N''Zérékoré', 'N''Zérékoré Centre', 'Tilepoulou', 'urbaine'),
('635de15c-f339-575a-82eb-c667b6cc3eaf', 'N''Zérékoré', 'N''Zérékoré', 'N''Zérékoré Centre', 'Belle Vue', 'urbaine'),
('c7fdbf6d-9d5f-5fbb-8f6e-de941c2014bb', 'N''Zérékoré', 'N''Zérékoré', 'N''Zérékoré Centre', 'Horoya 2', 'urbaine'),
('c79a997d-23c8-5471-9afe-62a77ccefd6d', 'N''Zérékoré', 'N''Zérékoré', 'N''Zérékoré Centre', 'Kpoyeba', 'urbaine'),
('e55e851f-f605-52ef-b864-4c6de8f56324', 'N''Zérékoré', 'N''Zérékoré', 'N''Zérékoré Centre', 'Mohomou', 'urbaine'),
('1a8b4f95-a25b-5f1c-9ec7-7980f29280f4', 'N''Zérékoré', 'N''Zérékoré', 'N''Zérékoré Centre', 'Sokoura 1', 'urbaine'),
('c0111a22-501d-5e02-807e-b2a7f235a466', 'N''Zérékoré', 'N''Zérékoré', 'N''Zérékoré Centre', 'Sokoura 2', 'urbaine'),
('0684a6c1-6f01-5cdc-9efc-ccd9be745b77', 'N''Zérékoré', 'N''Zérékoré', 'N''Zérékoré Centre', 'Kwiteya poulou', 'urbaine'),
('07cd6ebb-a1a0-5dac-9746-a5ab5092fd05', 'N''Zérékoré', 'N''Zérékoré', 'N''Zérékoré Centre', 'Gonia 2', 'urbaine'),
('93307012-5f4e-5909-b2f2-d1e56346c341', 'N''Zérékoré', 'N''Zérékoré', 'N''Zérékoré Centre', 'Dorota', 'urbaine'),
('c1a4fffd-81af-5a24-abba-1f28eb070eb2', 'N''Zérékoré', 'N''Zérékoré', 'N''Zérékoré Centre', 'Gbanhana', 'urbaine'),
('9d41e50a-d8af-5220-b666-d9586a30b924', 'N''Zérékoré', 'N''Zérékoré', 'N''Zérékoré Centre', 'Commercial', 'urbaine'),
('7e685863-1b0c-5fb2-b9ff-a055bd245d1b', 'N''Zérékoré', 'N''Zérékoré', 'N''Zérékoré Centre', 'Nyean 2', 'urbaine'),
('8d0ee8c6-27c7-502c-9caa-b73db43895fe', 'N''Zérékoré', 'N''Zérékoré', 'N''Zérékoré Centre', 'Dorota 2', 'urbaine'),
('c450006a-809a-5bfd-8ffa-3353d1dd9848', 'N''Zérékoré', 'N''Zérékoré', 'N''Zérékoré Centre', 'Zebela Tokpa', 'urbaine'),
('5e2335ac-91e7-5c76-a28e-fae1de18007c', 'N''Zérékoré', 'N''Zérékoré', 'N''Zérékoré Centre', 'Gonia 1', 'urbaine'),

-- REGION DE N''Zérékoré - Prefecture N''Zérékoré - Communes Rurales

('6656864e-c579-59a9-8a54-a5f681e72023', 'N''Zérékoré', 'N''Zérékoré', 'Bounouma', 'Bounouma Centre', 'rurale'),
('5a2e5ec0-d0d4-57ef-8ba4-5a9203213adb', 'N''Zérékoré', 'N''Zérékoré', 'Gouecke', 'Gouecke Centre', 'rurale'),
('8621c159-7a46-58ac-9ec2-0ec53eddde5e', 'N''Zérékoré', 'N''Zérékoré', 'Kobela', 'Kobela Centre', 'rurale'),
('cd1a3b71-7358-5118-a72d-01b6840fa5f2', 'N''Zérékoré', 'N''Zérékoré', 'Koropara', 'Koropara Centre', 'rurale'),
('fecb192b-c38b-502a-b7cc-aec7088baf8a', 'N''Zérékoré', 'N''Zérékoré', 'Koule', 'Koule Centre', 'rurale'),
('e3fa36df-47cd-55be-b16b-9450c8ff924e', 'N''Zérékoré', 'N''Zérékoré', 'Pale', 'Pale Centre', 'rurale'),
('3bc63e12-fe59-5616-add6-a8ff6161341a', 'N''Zérékoré', 'N''Zérékoré', 'Samoe', 'Samoe Centre', 'rurale'),
('73e15ceb-18fb-5cc3-88ed-19ef3f449230', 'N''Zérékoré', 'N''Zérékoré', 'Soulouta', 'Soulouta Centre', 'rurale'),
('b40fbf45-0b20-5555-937b-a55c11eeec66', 'N''Zérékoré', 'N''Zérékoré', 'Womey', 'Womey Centre', 'rurale'),
('3452795c-22f4-5ffe-811a-c51bad248776', 'N''Zérékoré', 'N''Zérékoré', 'Yalenzou', 'Yalenzou Centre', 'rurale'),

-- REGION DE N''Zérékoré - Prefecture Beyla - Commune Urbaine

('2801d099-b722-520c-a298-ec02e65bb191', 'N''Zérékoré', 'Beyla', 'Beyla Centre', 'Beyla Centre Ville', 'urbaine'),

-- REGION DE N''Zérékoré - Prefecture Beyla - Communes Rurales

('615f3c78-2970-50a7-83ae-093ab699e975', 'N''Zérékoré', 'Beyla', 'Boola', 'Boola Centre', 'rurale'),
('60052209-9d0d-5b90-a2ac-3353052a8d6d', 'N''Zérékoré', 'Beyla', 'Diarraguerela', 'Diarraguerela Centre', 'rurale'),
('e02a103c-4cc6-5c70-84fc-f2fd3f466e26', 'N''Zérékoré', 'Beyla', 'Diassodou', 'Diassodou Centre', 'rurale'),
('d12d0ef2-54b9-5406-abe5-c281063f1866', 'N''Zérékoré', 'Beyla', 'Fouala', 'Fouala Centre', 'rurale'),
('4c3d1047-768d-5976-a0f5-76c518dc0ce0', 'N''Zérékoré', 'Beyla', 'Gbackedou', 'Gbackedou Centre', 'rurale'),
('0aed0b68-19bd-59bf-b9a2-ebe5d1adca39', 'N''Zérékoré', 'Beyla', 'Gbessoba', 'Gbessoba Centre', 'rurale'),
('3c40c9ef-df02-5f07-a9ac-0340b6e10195', 'N''Zérékoré', 'Beyla', 'Karala', 'Karala Centre', 'rurale'),
('c8301c57-d30d-5415-b9ed-8eb3290d6edd', 'N''Zérékoré', 'Beyla', 'Koumandou', 'Koumandou Centre', 'rurale'),
('fef71bc2-91dc-54d9-807a-f701e1f967cb', 'N''Zérékoré', 'Beyla', 'Moussadou', 'Moussadou Centre', 'rurale'),
('de87be03-d149-544c-b1a9-3cbb6d10a231', 'N''Zérékoré', 'Beyla', 'Niossomoridou', 'Niossomoridou Centre', 'rurale'),
('ea46e1c4-5269-5cba-bdb4-b68729da049d', 'N''Zérékoré', 'Beyla', 'Samana', 'Samana Centre', 'rurale'),
('5576cf4e-c279-50f8-8f3b-c581ffb70a7c', 'N''Zérékoré', 'Beyla', 'Sinko', 'Sinko Centre', 'rurale'),
('3a651ccd-374c-5f30-8a61-36a259afe4df', 'N''Zérékoré', 'Beyla', 'Sokourala', 'Sokourala Centre', 'rurale'),
('1cebe277-d579-5670-8df6-15da523fbb23', 'N''Zérékoré', 'Beyla', 'Thiewa', 'Thiewa Centre', 'rurale'),
('08087d3d-a1d0-54ba-9346-4e8a0a53e654', 'N''Zérékoré', 'Beyla', 'Fonodou', 'Fonodou Centre', 'rurale'),

-- REGION DE N''Zérékoré - Prefecture Gueckedou - Commune Urbaine

('7e2897a8-2f2f-55a6-b78a-ea87f11897b6', 'N''Zérékoré', 'Gueckedou', 'Gueckedou Centre', 'Gueckedou Centre Ville', 'urbaine'),

-- REGION DE N''Zérékoré - Prefecture Gueckedou - Communes Rurales

('b56ab5df-32cb-5819-81af-fcc40dbb85c1', 'N''Zérékoré', 'Gueckedou', 'Bolodou', 'Bolodou Centre', 'rurale'),
('1165775d-c725-56ad-8e5f-4e979b074aa7', 'N''Zérékoré', 'Gueckedou', 'Fangamadou', 'Fangamadou Centre', 'rurale'),
('aeda0fe9-bd12-56a4-9c5c-64c21bf50695', 'N''Zérékoré', 'Gueckedou', 'Guendembou', 'Guendembou Centre', 'rurale'),
('637f67d2-b2d8-5ea6-9d28-85155e35d96c', 'N''Zérékoré', 'Gueckedou', 'Kassadou', 'Kassadou Centre', 'rurale'),
('1ca1882b-5c30-5914-8f89-01108b065c19', 'N''Zérékoré', 'Gueckedou', 'Koundou', 'Koundou Centre', 'rurale'),
('ac5021e7-5557-5694-bf6c-5e2163a5f971', 'N''Zérékoré', 'Gueckedou', 'Nongoa', 'Nongoa Centre', 'rurale'),
('c13c5252-26ef-5ce1-bbbc-c9d0d71e2087', 'N''Zérékoré', 'Gueckedou', 'Ouende-Kenema', 'Ouende-Kenema Centre', 'rurale'),
('75303751-88d1-520d-932e-4ebc7a14228f', 'N''Zérékoré', 'Gueckedou', 'Tekoulo', 'Tekoulo Centre', 'rurale'),
('1424aa2a-a648-595b-8718-a349f8faade4', 'N''Zérékoré', 'Gueckedou', 'Termessadou', 'Termessadou Centre', 'rurale'),
('fc463654-47ad-5db6-b9a8-a7d434d4424b', 'N''Zérékoré', 'Gueckedou', 'Kondembadou', 'Kondembadou Centre', 'rurale'),
('2b75429a-2a39-5185-8581-e443b811610c', 'N''Zérékoré', 'Gueckedou', 'Guelo N''Faly', 'Guelo N''Faly Centre', 'rurale'),

-- REGION DE N''Zérékoré - Prefecture Lola - Commune Urbaine

('22665d07-82ac-5fb0-a18c-05f8a8e0c96f', 'N''Zérékoré', 'Lola', 'Lola Centre', 'Lola Centre Ville', 'urbaine'),

-- REGION DE N''Zérékoré - Prefecture Lola - Communes Rurales

('cd0dc278-9fed-5b4f-ac41-679854dcd04e', 'N''Zérékoré', 'Lola', 'Bossou', 'Bossou Centre', 'rurale'),
('e6c0e763-f340-52d3-a835-da54433c1080', 'N''Zérékoré', 'Lola', 'Foubadou', 'Foubadou Centre', 'rurale'),
('dda88787-4344-5a02-8d89-59a7e2e0077a', 'N''Zérékoré', 'Lola', 'Gama-Berema', 'Gama-Berema Centre', 'rurale'),
('6d71b427-8723-50d1-8874-6bb15ee86f2e', 'N''Zérékoré', 'Lola', 'Gueasso', 'Gueasso Centre', 'rurale'),
('eeafa453-be7f-5cec-8050-e1bbd8142401', 'N''Zérékoré', 'Lola', 'Kokota', 'Kokota Centre', 'rurale'),
('2158131b-fded-5601-be4a-fb25bfa8fa14', 'N''Zérékoré', 'Lola', 'Laine', 'Laine Centre', 'rurale'),
('f1c83667-8a04-534d-9a37-d636ba58db46', 'N''Zérékoré', 'Lola', 'N''Zoo', 'N''Zoo Centre', 'rurale'),
('7c9fc238-5784-5f56-bd70-20a180ca5ca6', 'N''Zérékoré', 'Lola', 'Tounkarata', 'Tounkarata Centre', 'rurale'),

-- REGION DE N''Zérékoré - Prefecture Macenta - Commune Urbaine

('09878e40-5425-55b8-b0d3-6ef543baefa8', 'N''Zérékoré', 'Macenta', 'Macenta Centre', 'Macenta Centre Ville', 'urbaine'),

-- REGION DE N''Zérékoré - Prefecture Macenta - Communes Rurales

('5e2d7e72-42ed-5236-9da9-c31f74c2e7c7', 'N''Zérékoré', 'Macenta', 'Balizia', 'Balizia Centre', 'rurale'),
('2c79029c-269d-5260-8289-71219b2eebcd', 'N''Zérékoré', 'Macenta', 'Binikala', 'Binikala Centre', 'rurale'),
('c3e0a510-5f81-582d-a1af-30c295e4e9e5', 'N''Zérékoré', 'Macenta', 'Bofossou', 'Bofossou Centre', 'rurale'),
('e158ec6d-2143-5007-ae3a-9d2a8cbaef1f', 'N''Zérékoré', 'Macenta', 'Daro', 'Daro Centre', 'rurale'),
('68d51416-4a59-5be5-89be-04f53184fba4', 'N''Zérékoré', 'Macenta', 'Fassankoni', 'Fassankoni Centre', 'rurale'),
('c338ea44-3616-54bc-b5fc-f00da2424c5b', 'N''Zérékoré', 'Macenta', 'Kouankan', 'Kouankan Centre', 'rurale'),
('ddd0fb6e-c48b-516c-a77a-0047e463cd47', 'N''Zérékoré', 'Macenta', 'Koyama', 'Koyama Centre', 'rurale'),
('c978689e-860a-52ca-85e7-a7e7ce13640d', 'N''Zérékoré', 'Macenta', 'N''Zebela', 'N''Zebela Centre', 'rurale'),
('c857a1ba-0f74-5d12-831e-47fd067d6b24', 'N''Zérékoré', 'Macenta', 'Oremai', 'Oremai Centre', 'rurale'),
('e355e9fd-643c-5ec1-acd8-3d6d5e1f27ee', 'N''Zérékoré', 'Macenta', 'Panziazou', 'Panziazou Centre', 'rurale'),
('050ab99e-6cc6-5ced-9955-f8cca2044160', 'N''Zérékoré', 'Macenta', 'Sangbedou', 'Sangbedou Centre', 'rurale'),
('07100c7a-e7d8-5316-b95d-4116a7a61773', 'N''Zérékoré', 'Macenta', 'Seredou', 'Seredou Centre', 'rurale'),
('8111e7ef-ae6a-5b53-bb6d-bd054550f9fd', 'N''Zérékoré', 'Macenta', 'Vaseredou', 'Vaseredou Centre', 'rurale'),
('ba693cb9-e5e8-5fdf-8417-afdd0982550f', 'N''Zérékoré', 'Macenta', 'Watanka', 'Watanka Centre', 'rurale'),

-- REGION DE N''Zérékoré - Prefecture Yomou - Commune Urbaine

('da0fde1e-0812-51dc-aa66-3b39427af778', 'N''Zérékoré', 'Yomou', 'Yomou Centre', 'Yomou Centre Ville', 'urbaine'),

-- REGION DE N''Zérékoré - Prefecture Yomou - Communes Rurales

('6e0ce771-c316-52d9-b4f9-96a56c17fe9d', 'N''Zérékoré', 'Yomou', 'Banire', 'Banire Centre', 'rurale'),
('89eef266-15b5-5093-9502-ce0786886612', 'N''Zérékoré', 'Yomou', 'Bheta', 'Bheta Centre', 'rurale'),
('bad27111-263e-5743-b7dc-32e721a010e2', 'N''Zérékoré', 'Yomou', 'Bignamou', 'Bignamou Centre', 'rurale'),
('74a174d5-7591-5714-b6ad-f604971de788', 'N''Zérékoré', 'Yomou', 'Bowe', 'Bowe Centre', 'rurale'),
('0c4c48ea-8d1d-5a5b-8d77-19dae380e9de', 'N''Zérékoré', 'Yomou', 'Diecke', 'Diecke Centre', 'rurale'),
('8657c7d8-7b04-50fc-96ca-08fb76a4047d', 'N''Zérékoré', 'Yomou', 'Pela', 'Pela Centre', 'rurale'),

-- REGION DE MAMOU - Prefecture Dalaba - Commune Urbaine

('df549e63-dff8-5c7f-a917-17284c6a0def', 'Mamou', 'Dalaba', 'Dalaba Centre', 'Dalaba Centre Ville', 'urbaine'),

-- REGION DE MAMOU - Prefecture Dalaba - Communes Rurales

('35aa2811-5802-56ee-9cdc-44ab70bebe82', 'Mamou', 'Dalaba', 'Bodie', 'Bodie Centre', 'rurale'),
('172abc39-1249-54d8-9fcd-a74dc4bdfdc9', 'Mamou', 'Dalaba', 'Ditinn', 'Ditinn Centre', 'rurale'),
('3fa6bc10-4599-5b4a-a5a8-0f28c0d3deb1', 'Mamou', 'Dalaba', 'Kaala', 'Kaala Centre', 'rurale'),
('265ba533-df2c-5567-a596-4c1da0530d14', 'Mamou', 'Dalaba', 'KankaLabé', 'KankaLabé Centre', 'rurale'),
('e8a6d6ca-8abd-541b-b6ae-288b56bf827e', 'Mamou', 'Dalaba', 'Kebali', 'Kebali Centre', 'rurale'),
('9343f397-18d9-5ac8-a58e-c050f6f99a19', 'Mamou', 'Dalaba', 'Koba', 'Koba Centre', 'rurale'),
('8e132824-4f2a-558d-a17b-a7bfeed958c1', 'Mamou', 'Dalaba', 'Mafara', 'Mafara Centre', 'rurale'),
('351dbe63-22da-5da3-a15f-a09e58e66acf', 'Mamou', 'Dalaba', 'Mitty', 'Mitty Centre', 'rurale'),
('d22617c9-2e79-5dca-9d5e-33035822f70b', 'Mamou', 'Dalaba', 'Mombeya', 'Mombeya Centre', 'rurale'),
('d9368012-bae7-5982-82b8-d8c93a0de071', 'Mamou', 'Dalaba', 'Kourou', 'Kourou Centre', 'rurale'),

-- REGION DE MAMOU - Prefecture Mamou - Commune Urbaine

('56554416-6323-5072-a58b-dd1ff8b116fc', 'Mamou', 'Mamou', 'Mamou Centre', 'Horé Mamou', 'urbaine'),
('23702f62-c2d3-55f3-8335-72e84fda608e', 'Mamou', 'Mamou', 'Mamou Centre', 'Madina Scierie', 'urbaine'),
('4db9b1b0-4ad5-5f09-9fdb-e9d3949b1dad', 'Mamou', 'Mamou', 'Mamou Centre', 'Madina Mosquee', 'urbaine'),
('02ce7bf6-71d3-5c25-aed8-1885bbdd6270', 'Mamou', 'Mamou', 'Mamou Centre', 'Hore Fello 1', 'urbaine'),
('1ec0b825-07f4-548f-9796-bb744a8e435d', 'Mamou', 'Mamou', 'Mamou Centre', 'Hore Fello 2', 'urbaine'),
('2022304f-6c71-5dcc-9b2a-d7b89e3f91aa', 'Mamou', 'Mamou', 'Mamou Centre', 'Poudrière 1', 'urbaine'),
('0d7ce2fe-9779-557e-858b-a8f77de02830', 'Mamou', 'Mamou', 'Mamou Centre', 'Poudrière 2', 'urbaine'),
('e69cdae9-46c6-5051-9ecf-59c6922c47ad', 'Mamou', 'Mamou', 'Mamou Centre', 'Almamya Residence', 'urbaine'),
('a7c0746c-32f5-527d-8e2e-658a1b5fdf73', 'Mamou', 'Mamou', 'Mamou Centre', 'Almamya Mosquée', 'urbaine'),
('9f2f13b5-7ca2-5376-a2ad-a537d9ce32bb', 'Mamou', 'Mamou', 'Mamou Centre', 'Almamya Dumya', 'urbaine'),
('468e9de7-0ca5-5de6-82c2-1c2e3a10c335', 'Mamou', 'Mamou', 'Mamou Centre', 'Petel 1', 'urbaine'),
('cf77c426-e920-5c96-976f-a679ffac511a', 'Mamou', 'Mamou', 'Mamou Centre', 'Petel 2', 'urbaine'),
('469609a7-4c59-5f37-a808-18893cf56c7c', 'Mamou', 'Mamou', 'Mamou Centre', 'Madina Km 15', 'urbaine'),
('a4ef6c5d-a78c-56ec-9f72-b8b06da18d4d', 'Mamou', 'Mamou', 'Mamou Centre', 'Almamya Terrain', 'urbaine'),
('6654026f-7791-5d39-8321-4cdc5b2ebc88', 'Mamou', 'Mamou', 'Mamou Centre', 'Saabou', 'urbaine'),
('5240e49c-01fd-5f02-9a17-54dc63a53d39', 'Mamou', 'Mamou', 'Mamou Centre', 'Sere', 'urbaine'),
('0b73a99b-9933-5d9e-a15f-23c7a77d37b6', 'Mamou', 'Mamou', 'Mamou Centre', 'Koumi', 'urbaine'),
('b07efd3d-6f6d-5101-bf72-693c2574b486', 'Mamou', 'Mamou', 'Mamou Centre', 'Madina Tambasa', 'urbaine'),
('3200e312-c15e-587f-ba70-41dfda786c11', 'Mamou', 'Mamou', 'Mamou Centre', 'Boutbinet', 'urbaine'),
('f7d85cdc-d6e9-5c9b-97b7-f792bb3176c5', 'Mamou', 'Mamou', 'Mamou Centre', 'Loppet 1', 'urbaine'),
('2bdbe529-ab59-52a4-9754-d316e637f55b', 'Mamou', 'Mamou', 'Mamou Centre', 'Loppet 2', 'urbaine'),
('a35192a5-4e06-5369-8a65-ee64cb71b190', 'Mamou', 'Mamou', 'Mamou Centre', 'Loppet Ecole', 'urbaine'),
('cfdfe346-2665-546a-b100-24922270d92a', 'Mamou', 'Mamou', 'Mamou Centre', 'Thiewngol', 'urbaine'),
('34521a00-14d4-5e01-a880-329fb3851221', 'Mamou', 'Mamou', 'Mamou Centre', 'Abattoir 1', 'urbaine'),
('564d8251-0eee-5ea7-b2a6-a05eb4376d04', 'Mamou', 'Mamou', 'Mamou Centre', 'Abattoir 2', 'urbaine'),
('891a5474-983b-5df5-a7af-47537105b2c9', 'Mamou', 'Mamou', 'Mamou Centre', 'Kimbely 1', 'urbaine'),
('d755baad-33d1-5a4d-8586-450d4dc938cd', 'Mamou', 'Mamou', 'Mamou Centre', 'Kimbely 2', 'urbaine'),
('8f851671-bd68-5ba8-b138-5c5258564469', 'Mamou', 'Mamou', 'Mamou Centre', 'Télico', 'urbaine'),

-- REGION DE MAMOU - Prefecture Mamou - Communes Rurales

('9e725e45-37f6-5280-b007-6e5e534a8d67', 'Mamou', 'Mamou', 'Bouliwel', 'Bouliwel Centre', 'rurale'),
('4fe710d9-8f43-590d-9958-a6f737eac5ef', 'Mamou', 'Mamou', 'Dounet', 'Dounet Centre', 'rurale'),
('d7732d03-2aa5-5f31-a2ce-65706e5a8fe2', 'Mamou', 'Mamou', 'Gongoret', 'Gongoret Centre', 'rurale'),
('0b3ab9b1-0545-5497-87fa-0ed0ff061f94', 'Mamou', 'Mamou', 'Kegneko', 'Kegneko Centre', 'rurale'),
('e35009a3-52e9-5139-82b1-ffa7ade63153', 'Mamou', 'Mamou', 'Konkouré', 'Konkouré Centre', 'rurale'),
('8b66ffb2-eb7e-5598-b103-a79b15885a51', 'Mamou', 'Mamou', 'Nyagara', 'Nyagara Centre', 'rurale'),
('a58dfec1-7c3f-5d62-ad23-ab578eebbda2', 'Mamou', 'Mamou', 'Oure-Kaba', 'Oure-Kaba Centre', 'rurale'),
('72a2136d-151f-50e6-b540-1a56cbbed65b', 'Mamou', 'Mamou', 'Poredaka', 'Poredaka Centre', 'rurale'),
('dfee6e8f-a236-57ef-8c3f-0093577f770c', 'Mamou', 'Mamou', 'Saramoussaya', 'Saramoussaya Centre', 'rurale'),
('13b19dc4-41dc-5a5d-bcd3-990e98ada212', 'Mamou', 'Mamou', 'Soyah', 'Soyah Centre', 'rurale'),
('c452380f-bc3e-5ea8-a172-d02d496cfc45', 'Mamou', 'Mamou', 'Teguereya', 'Teguereya Centre', 'rurale'),
('7ae39a98-c98f-5162-b817-7738dac7382d', 'Mamou', 'Mamou', 'Timbo', 'Timbo Centre', 'rurale'),
('b033479a-7c87-5296-b7b0-ae2da1eb21b1', 'Mamou', 'Mamou', 'Tolo', 'Tolo Centre', 'rurale'),

-- REGION DE MAMOU - Prefecture Pita - Commune Urbaine

('75ee091b-2e52-5075-a32c-3839ffab68fe', 'Mamou', 'Pita', 'Pita Centre', 'Pita Centre Ville', 'urbaine'),

-- REGION DE MAMOU - Prefecture Pita - Communes Rurales

('fb5e16fb-22c2-540c-baf7-8f5eabf1f673', 'Mamou', 'Pita', 'Bantignel', 'Bantignel Centre', 'rurale'),
('080c6c0f-e0b1-5bec-8bd1-2668dbe1d8d6', 'Mamou', 'Pita', 'Bourouwal-Tappe', 'Bourouwal-Tappe Centre', 'rurale'),
('e9dcdc6d-cb1a-5fd5-a0fb-01faada043f7', 'Mamou', 'Pita', 'Donghol-Touma', 'Dongol-Touma Centre', 'rurale'),
('4ebc243a-6001-5d3a-8d3f-2fe75a058126', 'Mamou', 'Pita', 'Gongore', 'Gongore Centre', 'rurale'),
('2da8f5aa-924f-5f23-998a-d10d74b02cac', 'Mamou', 'Pita', 'Ley-Miro', 'Ley-Miro Centre', 'rurale'),
('48f239c1-6b38-53b9-a8f9-e82d223e8be2', 'Mamou', 'Pita', 'Maci', 'Maci Centre', 'rurale'),
('b4404ad3-c33b-5b5f-945c-3a7cf2dcd62b', 'Mamou', 'Pita', 'Ninguelande', 'Ninguelande Centre', 'rurale'),
('3a4c107c-472e-55ce-a009-69026b30b90c', 'Mamou', 'Pita', 'Sangareah', 'Sangareah Centre', 'rurale'),
('e364c8b8-e974-58ae-a2bf-4aa745af610f', 'Mamou', 'Pita', 'Sintaly', 'Sintaly Centre', 'rurale'),
('887e0dbc-305f-5424-b5a7-0a4817893c7c', 'Mamou', 'Pita', 'Timbi-Madina', 'Timbi-Madina Centre', 'rurale'),
('00c0192f-a2a1-5ad7-a1c9-382e4854623d', 'Mamou', 'Pita', 'Timbi-Touny', 'Timbi-Touny Centre', 'rurale'),

-- REGION DE Labé - Prefecture Labé - Commune Urbaine

('86d3ff24-7f3e-57d1-a66a-6e74ef563868', 'Labé', 'Labé', 'Labé Centre', 'Daka 1', 'urbaine'),
('5c78f623-e3f1-5161-a48c-24ba30f6ece8', 'Labé', 'Labé', 'Labé Centre', 'Daka 2', 'urbaine'),
('533002d9-393d-5a64-b8e2-8e78654a434f', 'Labé', 'Labé', 'Labé Centre', 'Donghora', 'urbaine'),
('173d5918-f91b-50a5-bbf7-630fbcd42838', 'Labé', 'Labé', 'Labé Centre', 'Dow Sare', 'urbaine'),
('2e736957-50b7-5175-8117-f95a496dc666', 'Labé', 'Labé', 'Labé Centre', 'Konkola', 'urbaine'),
('48ceb276-bfdf-5998-b424-17eb4bc83e20', 'Labé', 'Labé', 'Labé Centre', 'Kouroula', 'urbaine'),
('076ebd1a-f1ad-5ee0-bafa-70cd31e48198', 'Labé', 'Labé', 'Labé Centre', 'Mairie', 'urbaine'),
('6d364e25-bbe1-54a0-9b9f-6a42b7f7ed38', 'Labé', 'Labé', 'Labé Centre', 'Madina', 'urbaine'),
('d482b267-6aed-5ca7-a19b-9e15c2692487', 'Labé', 'Labé', 'Labé Centre', 'Mosquee', 'urbaine'),
('70a543af-bc73-56dc-9f8d-66294b22a074', 'Labé', 'Labé', 'Labé Centre', 'Pounthioun', 'urbaine'),
('81a85244-429f-5350-a42a-d250bda636a1', 'Labé', 'Labé', 'Labé Centre', 'Tata 1', 'urbaine'),
('86387f5a-7c59-511b-9249-0212781c6dc9', 'Labé', 'Labé', 'Labé Centre', 'Tata 2', 'urbaine'),
('36a5f1af-4a7b-5a5d-84b6-cf4599543424', 'Labé', 'Labé', 'Labé Centre', 'Bambaya', 'urbaine'),
('114df24d-f7c0-519b-9af4-9cbef705bd87', 'Labé', 'Labé', 'Labé Centre', 'Companya', 'urbaine'),
('f25f690c-c449-5848-8c94-326c04a9e4c9', 'Labé', 'Labé', 'Labé Centre', 'Donghol', 'urbaine'),
('3a555c45-8b4c-58a1-bf9b-ff309b4ce774', 'Labé', 'Labé', 'Labé Centre', 'Donghol Dayebhe', 'urbaine'),
('851380e7-6eb5-51f9-be34-66631a568b9b', 'Labé', 'Labé', 'Labé Centre', 'Fady', 'urbaine'),
('c64f4618-4d63-5d2a-99c3-87862191da12', 'Labé', 'Labé', 'Labé Centre', 'Fafabhe', 'urbaine'),
('22208796-b1da-5a50-aad1-69c04cf6fcdc', 'Labé', 'Labé', 'Labé Centre', 'Falo Bowe', 'urbaine'),
('96243512-3192-5dd2-99bf-8cc013c71f4c', 'Labé', 'Labé', 'Labé Centre', 'Hore Saala', 'urbaine'),
('1faa6ad6-7339-51b8-b748-65881fc02468', 'Labé', 'Labé', 'Labé Centre', 'Koulidara', 'urbaine'),
('1d0b9fdb-8828-532d-a507-65d773120db9', 'Labé', 'Labé', 'Labé Centre', 'Lombonna', 'urbaine'),
('702a2b98-bcf2-50ca-827e-0ec0cc24f385', 'Labé', 'Labé', 'Labé Centre', 'Nadhel', 'urbaine'),
('5a60a513-3be0-56fc-bb00-264a25d762b8', 'Labé', 'Labé', 'Labé Centre', 'Petewel', 'urbaine'),
('e9086d4b-c790-50ce-ae6d-e557d1058f58', 'Labé', 'Labé', 'Labé Centre', 'Poreko', 'urbaine'),
('f937b737-b53a-5f83-9a84-de8a8b2250f8', 'Labé', 'Labé', 'Labé Centre', 'Saala N''Douyebhe', 'urbaine'),
('2d3500e1-ef7f-51ab-b63c-f0eb140b1e26', 'Labé', 'Labé', 'Labé Centre', 'Safatou 1', 'urbaine'),
('668f48be-1bfe-5b13-a7fe-8b0e70f86869', 'Labé', 'Labé', 'Labé Centre', 'Safatou 2', 'urbaine'),
('73b0d4fa-6367-5eac-bac0-18e82df49d1c', 'Labé', 'Labé', 'Labé Centre', 'Domby', 'urbaine'),
('31b3c40f-0c1e-5228-93cb-e25d7decee81', 'Labé', 'Labé', 'Labé Centre', 'Hore Hollande', 'urbaine'),
('71525244-b98a-57e4-88b5-7a624bf2363c', 'Labé', 'Labé', 'Labé Centre', 'Niolou', 'urbaine'),

-- REGION DE Labé - Prefecture Labé - Communes Rurales

('a10ea402-0e78-5919-9494-6065eea60684', 'Labé', 'Labé', 'Dalein', 'Dalein Centre', 'rurale'),
('73879a1f-c677-5887-846f-ede59975a339', 'Labé', 'Labé', 'DaraLabé', 'DaraLabé Centre', 'rurale'),
('f9bef757-34c8-5ed3-9a96-80da9623e39f', 'Labé', 'Labé', 'Diari', 'Diari Centre', 'rurale'),
('7e19e667-62aa-51bc-b900-12e0cfc8e7ab', 'Labé', 'Labé', 'Dionfo', 'Dionfo Centre', 'rurale'),
('a0072072-78bb-5844-b85c-ce3246efebd4', 'Labé', 'Labé', 'Garambe', 'Garambe Centre', 'rurale'),
('f18a7717-fdf0-5218-b7d7-9468bf31d855', 'Labé', 'Labé', 'Hafia', 'Hafia Centre', 'rurale'),
('db53f7b2-de46-52b2-a832-f413879b198f', 'Labé', 'Labé', 'Kaalan', 'Kaalan Centre', 'rurale'),
('1754963a-7ec4-54e6-bcfb-c7fae07154a7', 'Labé', 'Labé', 'Kouramangui', 'Kouramangui Centre', 'rurale'),
('53f8c875-9aa2-54ef-b4e0-7baae8cd03a3', 'Labé', 'Labé', 'Noussy', 'Noussy Centre', 'rurale'),
('14dbebed-be96-560a-b346-75f2348080c1', 'Labé', 'Labé', 'Popodara', 'Popodara Centre', 'rurale'),
('85887bb6-17a2-5798-86e0-0c346a7b1c76', 'Labé', 'Labé', 'Sannou', 'Sannou Centre', 'rurale'),
('aef7bbaa-beb3-5026-b030-c40c3e4916e5', 'Labé', 'Labé', 'Tarambaly', 'Tarambaly Centre', 'rurale'),
('a2d74065-e19c-5085-9005-c4f9acaef9af', 'Labé', 'Labé', 'Tountouroun', 'Tountouroun Centre', 'rurale'),

-- REGION DE Labé - Prefecture Koubia - Commune Urbaine

('d0b333a6-3694-5fa0-a677-2ba05b3f6dd8', 'Labé', 'Koubia', 'Koubia Centre', 'Koubia Centre Ville', 'urbaine'),

-- REGION DE Labé - Prefecture Koubia - Communes Rurales

('c4cada49-3002-5aa4-968e-c2ea3896ff49', 'Labé', 'Koubia', 'Fafaya', 'Fafaya Centre', 'rurale'),
('a4040009-270f-58da-a4ec-48f449e33c1b', 'Labé', 'Koubia', 'Gadha Woundou', 'Gadha Woundou Centre', 'rurale'),
('a8cc5e6b-86b6-551f-ab65-869f365fbb18', 'Labé', 'Koubia', 'Matakaou', 'Matakaou Centre', 'rurale'),
('79740cb3-ffc4-5e03-9d5b-48bdcb48fbd9', 'Labé', 'Koubia', 'Missira', 'Missira Centre', 'rurale'),
('ade237f3-2924-56e7-92a8-ccceb0cc9ce4', 'Labé', 'Koubia', 'Pilimini', 'Pilimini Centre', 'rurale'),

-- REGION DE Labé - Prefecture Lelouma - Commune Urbaine

('f191f1e2-ca93-5e68-8170-f727d787d2b5', 'Labé', 'Lelouma', 'Lelouma Centre', 'Lelouma Centre Ville', 'urbaine'),

-- REGION DE Labé - Prefecture Lelouma - Communes Rurales

('a2116142-fe4a-50aa-b002-6319509a6581', 'Labé', 'Lelouma', 'Balaya', 'Balaya Centre', 'rurale'),
('ba0d561c-e7c3-5844-8523-b6c5bfee6b9f', 'Labé', 'Lelouma', 'Djountou', 'Djountou Centre', 'rurale'),
('a79979b3-26e4-5f01-8273-7f397e31504b', 'Labé', 'Lelouma', 'Herico', 'Herico Centre', 'rurale'),
('b53c136d-5873-5c2b-8d3a-8164c5bc73b2', 'Labé', 'Lelouma', 'Korbe', 'Korbe Centre', 'rurale'),
('dde40eec-af56-53dc-ad09-25990e3cdbc9', 'Labé', 'Lelouma', 'Lafou', 'Lafou Centre', 'rurale'),
('e188b073-b8bd-5a52-b092-7e2abd284d0a', 'Labé', 'Lelouma', 'Linsansaran', 'Linsansaran Centre', 'rurale'),
('e65520b2-4e4e-5e45-a68c-23381a0b6aeb', 'Labé', 'Lelouma', 'Manda', 'Manda Centre', 'rurale'),
('a54f2b43-4f0f-5882-9ca2-7aa7af3841b5', 'Labé', 'Lelouma', 'Parawol', 'Parawol Centre', 'rurale'),
('139833b4-be4e-5dfa-87d1-fafe94ddf521', 'Labé', 'Lelouma', 'Sagale', 'Sagale Centre', 'rurale'),
('de97e471-d90b-5525-bac4-d39bdbaccb95', 'Labé', 'Lelouma', 'Tyanguel-Bori', 'Tyanguel-Bori Centre', 'rurale'),

-- REGION DE Labé - Prefecture Mali - Commune Urbaine

('04e30c77-b9ef-545b-9c18-d63573e53495', 'Labé', 'Mali', 'Mali Centre', 'Mali Centre Ville', 'urbaine'),

-- REGION DE Labé - Prefecture Mali - Communes Rurales

('5640f73e-3101-57d5-b415-a9d68c58b723', 'Labé', 'Mali', 'Balaki', 'Balaki Centre', 'rurale'),
('2ff3afce-2bed-5325-b74a-81de3041f404', 'Labé', 'Mali', 'Donghol Sigon', 'Donghol Sigon Centre', 'rurale'),
('8c9283ac-e4b6-50de-8dd5-55b39d5993d0', 'Labé', 'Mali', 'Dougountouny', 'Dougountouny Centre', 'rurale'),
('9db57cb4-e77f-592f-93a6-76e097fac0e1', 'Labé', 'Mali', 'Fougou', 'Fougou Centre', 'rurale'),
('0168294a-fe48-5653-8e15-f10e2d3ff211', 'Labé', 'Mali', 'Gayah', 'Gayah Centre', 'rurale'),
('b56ea249-084e-5d2d-a01d-52e8c9e36327', 'Labé', 'Mali', 'Hidayatou', 'Hidayatou Centre', 'rurale'),
('de068b29-eeec-5e8c-936f-6088ffd1b5ab', 'Labé', 'Mali', 'Lebekere', 'Lebekere Centre', 'rurale'),
('b7998f71-c55c-5c52-b6f5-68d7e638f149', 'Labé', 'Mali', 'Madina-Wora', 'Madina-Wora Centre', 'rurale'),
('763a6781-0fee-5a4e-b1d3-bc5d3b7abc04', 'Labé', 'Mali', 'Salambande', 'Salambande Centre', 'rurale'),
('379ac6cb-a9ee-58fc-b939-233de558ce81', 'Labé', 'Mali', 'Telire', 'Telire Centre', 'rurale'),
('25b8c54a-0d57-53e2-afbe-6747e891d5e7', 'Labé', 'Mali', 'Touba', 'Touba Centre', 'rurale'),
('88586606-ad17-5bf4-bca9-545e92015392', 'Labé', 'Mali', 'Yimbering', 'Yimbering Centre', 'rurale'),

-- REGION DE Labé - Prefecture Tougué - Commune Urbaine

('6dca2899-4352-53fc-8093-ed279c0eb22b', 'Labé', 'Tougué', 'Tougué Centre', 'Tougué Centre Ville', 'urbaine'),

-- REGION DE Labé - Prefecture Tougué - Communes Rurales

('4555e263-2cf0-5ce2-9373-f6cf112f4bb2', 'Labé', 'Tougué', 'Fatako', 'Fatako Centre', 'rurale'),
('94a9ba33-64bb-5f50-a6b6-e8e490751c36', 'Labé', 'Tougué', 'Fello-Koundoua', 'Fello-Koundoua Centre', 'rurale'),
('7bb7e08d-1d5e-5a51-92a5-3c139eb10066', 'Labé', 'Tougué', 'Kansangni', 'Kansangni Centre', 'rurale'),
('68e78a2f-e803-535c-a861-671854ce2976', 'Labé', 'Tougué', 'Kolangui', 'Kolangui Centre', 'rurale'),
('c355e455-3d8a-5823-8ac2-c1689ffb66e7', 'Labé', 'Tougué', 'Kollet', 'Kollet Centre', 'rurale'),
('84902c42-cc5d-5c4b-83c3-38e8b3e431cc', 'Labé', 'Tougué', 'Konah', 'Konah Centre', 'rurale'),
('258d809d-9feb-537c-b23c-1f547cb7a0f2', 'Labé', 'Tougué', 'Kouratongo', 'Kouratongo Centre', 'rurale'),
('bdc1ef0a-e9a5-52ed-b019-1a39742c1668', 'Labé', 'Tougué', 'Koyin', 'Koyin Centre', 'rurale'),
('2979fccf-47e6-5e6b-8f23-e10264148085', 'Labé', 'Tougué', 'Tangali', 'Tangali Centre', 'rurale'),

-- REGION DE FARANAH - Prefecture Faranah - Commune Urbaine

('ad36417b-8202-5a66-91a4-42cc3ba045e1', 'Faranah', 'Faranah', 'Faranah Centre', 'Abattoir 1', 'urbaine'),
('1a35aa69-d841-599e-98b4-6827a47f03be', 'Faranah', 'Faranah', 'Faranah Centre', 'Abattoir 2', 'urbaine'),
('208fc85a-644a-5bb6-a485-e779060985fd', 'Faranah', 'Faranah', 'Faranah Centre', 'Tonkolonko 1', 'urbaine'),
('9110735a-cc26-5290-a577-fa282418abc0', 'Faranah', 'Faranah', 'Faranah Centre', 'Tonkolonko 2', 'urbaine'),
('184eb04c-d692-55c6-bae2-bb1b12f86879', 'Faranah', 'Faranah', 'Faranah Centre', 'Marche 1', 'urbaine'),
('ffcc3d3b-7dea-535c-9a18-8b1b0d925648', 'Faranah', 'Faranah', 'Faranah Centre', 'Marche 2', 'urbaine'),
('63d1935d-bdb0-544f-9a26-580f91ee4264', 'Faranah', 'Faranah', 'Faranah Centre', 'Sirikoloni 1', 'urbaine'),
('955db6f4-0f00-5107-a5ca-ac469bb3df9e', 'Faranah', 'Faranah', 'Faranah Centre', 'Sirikoloni 2', 'urbaine'),
('1cb71b55-e5ba-51dc-9a45-a427c25c1b07', 'Faranah', 'Faranah', 'Faranah Centre', 'Mosquee', 'urbaine'),
('f1b41206-fa5b-54a5-b7eb-26b12f95f061', 'Faranah', 'Faranah', 'Faranah Centre', 'Dandaya', 'urbaine'),
('155c31b6-84a0-5b11-8485-052cc4447445', 'Faranah', 'Faranah', 'Faranah Centre', 'Faranakoura', 'urbaine'),
('a4d0c4b2-d793-5745-9b8c-e0ba3f5b0849', 'Faranah', 'Faranah', 'Faranah Centre', 'Ponkomah', 'urbaine'),
('374f7a56-e15d-508f-86d5-2cafd0900b79', 'Faranah', 'Faranah', 'Faranah Centre', 'Hamdallaye', 'urbaine'),

-- REGION DE FARANAH - Prefecture Faranah - Communes Rurales

('f0717461-31d8-5ed1-b361-2f25bcad78c0', 'Faranah', 'Faranah', 'Banian', 'Banian Centre', 'rurale'),
('e126c297-e9e5-5a26-8a10-674d1d4809e4', 'Faranah', 'Faranah', 'Beindou', 'Beindou Centre', 'rurale'),
('40497894-870f-59ba-80a7-c9cb88fe1e55', 'Faranah', 'Faranah', 'Gnaleah', 'Gnaleah Centre', 'rurale'),
('a47a0a41-3610-5350-bbca-1b4963f5a0b4', 'Faranah', 'Faranah', 'Hermakono', 'Hermakono Centre', 'rurale'),
('d860aa37-eb7f-58ba-a24d-7575be7d70f0', 'Faranah', 'Faranah', 'Kobikoro', 'Kobikoro Centre', 'rurale'),
('fd0db37e-95df-5741-849b-94bc1a229147', 'Faranah', 'Faranah', 'Marela', 'Marela Centre', 'rurale'),
('b482217b-bad2-50ff-bd26-5d17044c2f07', 'Faranah', 'Faranah', 'Passayah', 'Passayah Centre', 'rurale'),
('02ec9fa4-0aa1-5bcc-a7c7-63f74da47ff4', 'Faranah', 'Faranah', 'Sandeniah', 'Sandeniah Centre', 'rurale'),
('b024b47e-66af-5afa-b40d-6ba6bcdb1d89', 'Faranah', 'Faranah', 'Songoyah', 'Songoyah Centre', 'rurale'),
('7f82d464-7921-5174-8c4e-6dfe927d326e', 'Faranah', 'Faranah', 'Tindo', 'Tindo Centre', 'rurale'),
('dee8ed1e-8702-5f22-8848-bdaba233d7b0', 'Faranah', 'Faranah', 'Tiro', 'Tiro Centre', 'rurale'),
('26b4551c-7694-502e-843a-e26fa00989e1', 'Faranah', 'Faranah', 'Bantou', 'Bantou Centre', 'rurale'),
('8b652446-2cbb-5947-9695-f61b286cb835', 'Faranah', 'Faranah', 'Dantilia', 'Dantilia Centre', 'rurale'),
('99e26c19-b3ee-58be-9584-9bdf57e4614d', 'Faranah', 'Faranah', 'Ballaya', 'Ballaya Centre', 'rurale'),
('42b921aa-5037-5c2a-b00d-a79e12b3d981', 'Faranah', 'Faranah', 'Bambaya', 'Bambaya Centre', 'rurale'),

-- REGION DE FARANAH - Prefecture Dabola - Commune Urbaine

('ed9f9366-051d-5b77-babb-2d666b9e6a53', 'Faranah', 'Dabola', 'Dabola Centre', 'Dabola Centre Ville', 'urbaine'),

-- REGION DE FARANAH - Prefecture Dabola - Communes Rurales

('b3d0d0d5-f3a5-547c-ab9b-e086eb3a4cb7', 'Faranah', 'Dabola', 'Arfamoussaya', 'Arfamoussaya Centre', 'rurale'),
('cb970192-9d74-5c11-8031-fa589a0a9cc7', 'Faranah', 'Dabola', 'Banko', 'Banko Centre', 'rurale'),
('1dcb74af-2785-5f32-bec4-a72decdddac1', 'Faranah', 'Dabola', 'Bissikrima', 'Bissikrima Centre', 'rurale'),
('6aec2db6-7a8e-57e9-bd61-2fd30edf3392', 'Faranah', 'Dabola', 'Dogomet', 'Dogomet Centre', 'rurale'),
('07794ba5-94da-5a84-8762-942eb7e2764d', 'Faranah', 'Dabola', 'Kankama', 'Kankama Centre', 'rurale'),
('9bb7fb1e-527e-53c2-93d5-a127888235f7', 'Faranah', 'Dabola', 'Kindoye', 'Kindoye Centre', 'rurale'),
('128e468e-170b-5416-bee5-81680f62570e', 'Faranah', 'Dabola', 'Konindou', 'Konindou Centre', 'rurale'),
('9217b4ab-861d-51d0-a297-6518200b1a38', 'Faranah', 'Dabola', 'N''Dema', 'N''Dema Centre', 'rurale'),

-- REGION DE FARANAH - Prefecture Dinguiraye - Commune Urbaine

('ba603d33-0664-5d1f-89d5-bf8fb33bf1bc', 'Faranah', 'Dinguiraye', 'Dinguiraye Centre', 'Dinguiraye Centre Ville', 'urbaine'),

-- REGION DE FARANAH - Prefecture Dinguiraye - Communes Rurales

('e9575245-2b70-53dc-bd8e-8a342bb112d7', 'Faranah', 'Dinguiraye', 'Banora', 'Banora Centre', 'rurale'),
('bf0e3780-a4bf-5d6b-be58-42f8ba38ecf0', 'Faranah', 'Dinguiraye', 'Dialakoro', 'Dialakoro Centre', 'rurale'),
('5965db1a-2136-537b-bb5a-ba81d3bff460', 'Faranah', 'Dinguiraye', 'Diatifere', 'Diatifere Centre', 'rurale'),
('6a35196c-3d6f-5109-af2c-bb9e734eb426', 'Faranah', 'Dinguiraye', 'Gagnakaly', 'Gagnakaly Centre', 'rurale'),
('137abc84-ede8-5bf5-a8b9-c6698f3eee21', 'Faranah', 'Dinguiraye', 'Kalinko', 'Kalinko Centre', 'rurale'),
('be94ef52-50bc-5b07-91ac-011d9b3ebf53', 'Faranah', 'Dinguiraye', 'Lansanya', 'Lansanya Centre', 'rurale'),
('c74015c6-8666-50fe-bfab-ad5542bf738a', 'Faranah', 'Dinguiraye', 'Selouma', 'Selouma Centre', 'rurale'),

-- REGION DE FARANAH - Prefecture Kissidougou - Commune Urbaine

('948fbf81-571c-5eae-b615-3d911efd7c70', 'Faranah', 'Kissidougou', 'Kissidougou Centre', 'Kissidougou Centre Ville', 'urbaine'),

-- REGION DE FARANAH - Prefecture Kissidougou - Communes Rurales

('096b6e7d-686a-5bb2-b6bb-2b0b4bf92904', 'Faranah', 'Kissidougou', 'Albadariah', 'Albadariah Centre', 'rurale'),
('b2b2663e-0dfd-567f-8cdf-8333d6672bb0', 'Faranah', 'Kissidougou', 'Banama', 'Banama Centre', 'rurale'),
('a83715ae-69d3-559f-8d41-3f0fd74ad52b', 'Faranah', 'Kissidougou', 'Bardou', 'Bardou Centre', 'rurale'),
('89d828a0-a700-5129-94e2-53db5d0899a8', 'Faranah', 'Kissidougou', 'Beindou-Kissi', 'Beindou-Kissi Centre', 'rurale'),
('2c92cbb4-2b79-5321-9ebc-52da8d48114b', 'Faranah', 'Kissidougou', 'Fermesadou', 'Fermesadou Centre', 'rurale'),
('7ea7f59f-b18e-5283-bc6c-81f8bb5629c5', 'Faranah', 'Kissidougou', 'Firawa', 'Firawa Centre', 'rurale'),
('ae57f1ff-28f8-5b17-85b3-5f2eaaa7f93e', 'Faranah', 'Kissidougou', 'Gbangbadou', 'Gbangbadou Centre', 'rurale'),
('7065f32d-9612-5913-8e8e-9c7625f9b22c', 'Faranah', 'Kissidougou', 'Koundiadou', 'Koundiadou Centre', 'rurale'),
('0c4c7b2f-6fb3-5865-8fea-d56b4f8afff4', 'Faranah', 'Kissidougou', 'Manfran', 'Manfran Centre', 'rurale'),
('020e0cbd-3b43-59df-aab3-d978d0698c04', 'Faranah', 'Kissidougou', 'Sangardo', 'Sangardo Centre', 'rurale'),
('953a92fc-2fc0-5369-8815-72777581415b', 'Faranah', 'Kissidougou', 'Yende-Millimou', 'Yende-Millimou Centre', 'rurale'),
('a675f5c1-dbff-5bd1-aad5-2c5bf0012703', 'Faranah', 'Kissidougou', 'Yombiro', 'Yombiro Centre', 'rurale'),

-- REGION DE Boké - Prefecture Boffa - Commune Urbaine

('e744c9b6-1214-5c61-a492-edb556516b90', 'Boké', 'Boffa', 'Boffa Centre', 'Boffa Centre Ville', 'urbaine'),

-- REGION DE Boké - Prefecture Boffa - Communes Rurales

('ae41decd-c394-5b97-bcc2-8b9aac76a49a', 'Boké', 'Boffa', 'Colia', 'Colia Centre', 'rurale'),
('762c3c27-137f-550c-ae5c-0ec8d691d97e', 'Boké', 'Boffa', 'Douprou', 'Douprou Centre', 'rurale'),
('0ff2a299-2861-5da7-86e3-949ced569d5e', 'Boké', 'Boffa', 'Koba-Tatema', 'Koba-Tatema Centre', 'rurale'),
('8c79fb91-a711-5307-a985-2b8c2f1342db', 'Boké', 'Boffa', 'Lisso', 'Lisso Centre', 'rurale'),
('d609a275-a75c-5824-a097-2e4aa3789aee', 'Boké', 'Boffa', 'Mankountan', 'Mankountan Centre', 'rurale'),
('58c99e62-9ca4-5823-9b6e-e107009d86eb', 'Boké', 'Boffa', 'Tamita', 'Tamita Centre', 'rurale'),
('1a8aa5f1-9087-54a0-954a-bcf52358b850', 'Boké', 'Boffa', 'Tougnifily', 'Tougnifily Centre', 'rurale'),

-- REGION DE Boké - Prefecture Boké - Commune Urbaine

('10dd042b-9434-5b8c-9f90-4af836eb6ecc', 'Boké', 'Boké', 'Boké Centre', 'Boké Centre Ville', 'urbaine'),

-- REGION DE Boké - Prefecture Boké - Communes Rurales

('77b3874f-e02e-5ba4-b78a-b9a175c0a9d1', 'Boké', 'Boké', 'Bintimodya', 'Bintimodya Centre', 'rurale'),
('0b8d8180-9879-5d31-b583-d05b2cda2bd2', 'Boké', 'Boké', 'Dabiss', 'Dabiss Centre', 'rurale'),
('2002246a-b29d-56ff-9892-5c1f9d11aed9', 'Boké', 'Boké', 'Kamsar', 'Kamsar Centre', 'rurale'),
('cda0836e-a6ac-572a-a59c-a49348f34375', 'Boké', 'Boké', 'Kanfarande', 'Kanfarande Centre', 'rurale'),
('853bf515-4eeb-558e-be3b-ae8cac3a0d38', 'Boké', 'Boké', 'Kolaboui', 'Kolaboui Centre', 'rurale'),
('c979d8be-f106-5c25-914f-3efb61d9cc39', 'Boké', 'Boké', 'Malapouyah', 'Malapouyah Centre', 'rurale'),
('678bb935-64f3-59c0-bcbe-e69dc455de13', 'Boké', 'Boké', 'Sangaredi', 'Sangaredi Centre', 'rurale'),
('d3a3dc2f-aea2-52d1-9181-f98f41669867', 'Boké', 'Boké', 'Sansale', 'Sansale Centre', 'rurale'),
('61c48189-8b96-5080-98b1-f27f6bd63e6d', 'Boké', 'Boké', 'Tanene', 'Tanene Centre', 'rurale'),

-- REGION DE Boké - Prefecture Fria - Commune Urbaine

('c7c591c4-a485-5c26-b40b-cea982c1df5a', 'Boké', 'Fria', 'Fria Centre', 'Fria Centre Ville', 'urbaine'),

-- REGION DE Boké - Prefecture Fria - Communes Rurales

('b6d8b1b1-b09a-5675-8500-ee80d6485c24', 'Boké', 'Fria', 'Baguinet', 'Baguinet Centre', 'rurale'),
('11ce19bc-1e26-5f08-866d-42cb5d884634', 'Boké', 'Fria', 'Banguigny', 'Banguigny Centre', 'rurale'),
('a5b93abc-afdb-5b2c-a551-93a8687b4bfd', 'Boké', 'Fria', 'Tormelin', 'Tormelin Centre', 'rurale'),

-- REGION DE Boké - Prefecture Gaoual - Commune Urbaine

('411444b5-d510-5f83-98db-a79488fc39d3', 'Boké', 'Gaoual', 'Gaoual Centre', 'Gaoual Centre Ville', 'urbaine'),

-- REGION DE Boké - Prefecture Gaoual - Communes Rurales

('c5e6789d-6fec-57ad-9842-710f18720c3d', 'Boké', 'Gaoual', 'Foulamory', 'Foulamory Centre', 'rurale'),
('ad1da8e1-b22c-5274-bce4-2ac3dbf17348', 'Boké', 'Gaoual', 'Kakony', 'Kakony Centre', 'rurale'),
('c52f1306-1d96-5e23-8b49-5f6913fca90f', 'Boké', 'Gaoual', 'Koumbia', 'Koumbia Centre', 'rurale'),
('fa3595ed-4109-5a56-8e66-92cd1cea383a', 'Boké', 'Gaoual', 'Kounsitel', 'Kounsitel Centre', 'rurale'),
('52b9fda5-f8aa-5469-ab46-28b8a926f964', 'Boké', 'Gaoual', 'Malantan', 'Malantan Centre', 'rurale'),
('34a70f33-305a-512f-82f9-848b83823bb6', 'Boké', 'Gaoual', 'Touba', 'Touba Centre', 'rurale'),
('c54fb93f-967f-5701-a5f6-f966daca5acb', 'Boké', 'Gaoual', 'Wendou M''bour', 'Wendou M''bour Centre', 'rurale'),

-- REGION DE Boké - Prefecture Koundara - Commune Urbaine
('067de8ef-8a06-5933-af7d-be54ae509298', 'Boké', 'Koundara', 'Koundara Centre', 'Koundara Centre Ville', 'urbaine'),

-- REGION DE Boké - Prefecture Koundara - Communes Rurales
('f1ad9315-b588-50ff-97b9-4b27b4c0fa0f', 'Boké', 'Koundara', 'Guingan', 'Guingan Centre', 'rurale'),
('64a2e708-ad1c-5876-8e46-86f45e6e25df', 'Boké', 'Koundara', 'Kamaby', 'Kamaby Centre', 'rurale'),
('469aa90f-9cbd-51c6-a709-bc4e685f1811', 'Boké', 'Koundara', 'Sambailo', 'Sambailo Centre', 'rurale'),
('0c2cc776-319f-538b-8fc4-6eb29304dbd8', 'Boké', 'Koundara', 'Sareboido', 'Sareboido Centre', 'rurale'),
('0edb4378-b8f4-534d-8c71-387d258a7112', 'Boké', 'Koundara', 'Termesse', 'Termesse Centre', 'rurale'),
('5fc2dd87-0f87-5fa5-a05a-56ab5203c25b', 'Boké', 'Koundara', 'Youkounkou', 'Youkounkou Centre', 'rurale')
ON CONFLICT (id) DO NOTHING;