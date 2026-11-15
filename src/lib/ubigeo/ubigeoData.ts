// Tabla oficial de ubigeos del INEI (departamento / provincia / distrito), versión 2025.
// Fuente: INEI, recopilada en github.com/yull23/ubigeos_peru (databases/ubigeo_inei_2025.csv).
// Una línea por distrito: ubigeo|distrito|provincia|departamento|población. La población solo
// sirve para ordenar sugerencias (el distrito más grande primero). Se carga bajo demanda
// (import dinámico) desde ubigeo.ts: no pesa en la carga inicial de la app.
// SUNAT usa estos mismos códigos de 6 dígitos en las guías de remisión.
// Corrección a la fuente: 061306 (Ninabamba) venía con la provincia "Ninabamba"; es Santa Cruz.
export const UBIGEO_TABLE = `010101|Chachapoyas|Chachapoyas|Amazonas|41843
010102|Asunción|Chachapoyas|Amazonas|269
010103|Balsas|Chachapoyas|Amazonas|1125
010104|Cheto|Chachapoyas|Amazonas|716
010105|Chiliquín|Chachapoyas|Amazonas|554
010106|Chuquibamba|Chachapoyas|Amazonas|1872
010107|Granada|Chachapoyas|Amazonas|551
010108|Huancas|Chachapoyas|Amazonas|1538
010109|La Jalca|Chachapoyas|Amazonas|3279
010110|Leimebamba|Chachapoyas|Amazonas|3716
010111|Levanto|Chachapoyas|Amazonas|768
010112|Magdalena|Chachapoyas|Amazonas|895
010113|Mariscal Castilla|Chachapoyas|Amazonas|1653
010114|Molinopampa|Chachapoyas|Amazonas|2185
010115|Montevideo|Chachapoyas|Amazonas|452
010116|Olleros|Chachapoyas|Amazonas|448
010117|Quinjalca|Chachapoyas|Amazonas|757
010118|San Francisco de Daguas|Chachapoyas|Amazonas|335
010119|San Isidro de Maino|Chachapoyas|Amazonas|565
010120|Soloco|Chachapoyas|Amazonas|1214
010121|Sonche|Chachapoyas|Amazonas|289
010201|Bagua|Bagua|Amazonas|30921
010202|Aramango|Bagua|Amazonas|9458
010203|Copallín|Bagua|Amazonas|4093
010204|El Parco|Bagua|Amazonas|1240
010205|Imaza|Bagua|Amazonas|34658
010206|La Peca|Bagua|Amazonas|6155
010301|Jumbilla|Bongará|Amazonas|1207
010302|Chisquilla|Bongará|Amazonas|304
010303|Churuja|Bongará|Amazonas|289
010304|Corosha|Bongará|Amazonas|856
010305|Cuispes|Bongará|Amazonas|626
010306|Florida|Bongará|Amazonas|6245
010307|Jazán|Bongará|Amazonas|7494
010308|Recta|Bongará|Amazonas|205
010309|San Carlos|Bongará|Amazonas|619
010310|Shipasbamba|Bongará|Amazonas|1761
010311|Valera|Bongará|Amazonas|687
010312|Yambrasbamba|Bongará|Amazonas|5445
010401|Nieva|Condorcanqui|Amazonas|19256
010402|El Cenepa|Condorcanqui|Amazonas|13797
010403|Río Santiago|Condorcanqui|Amazonas|19486
010501|Lámud|Luya|Amazonas|2283
010502|Camporredondo|Luya|Amazonas|7767
010503|Cocabamba|Luya|Amazonas|1878
010504|Colcamar|Luya|Amazonas|1689
010505|Conila|Luya|Amazonas|1791
010506|Inguilpata|Luya|Amazonas|402
010507|Longuita|Luya|Amazonas|818
010508|Lonya Chico|Luya|Amazonas|753
010509|Luya|Luya|Amazonas|3911
010510|Luya Viejo|Luya|Amazonas|383
010511|María|Luya|Amazonas|711
010512|Ocalli|Luya|Amazonas|3971
010513|Ocumal|Luya|Amazonas|3508
010514|Pisuquia|Luya|Amazonas|4707
010515|Providencia|Luya|Amazonas|1300
010516|San Cristóbal|Luya|Amazonas|474
010517|San Francisco del Yeso|Luya|Amazonas|675
010518|San Jerónimo|Luya|Amazonas|500
010519|San Juan de Lopecancha|Luya|Amazonas|377
010520|Santa Catalina|Luya|Amazonas|2238
010521|Santo Tomás|Luya|Amazonas|2722
010522|Tingo|Luya|Amazonas|1392
010523|Trita|Luya|Amazonas|1464
010601|San Nicolás|Rodríguez de Mendoza|Amazonas|6690
010602|Chirimoto|Rodríguez de Mendoza|Amazonas|3017
010603|Cochamal|Rodríguez de Mendoza|Amazonas|648
010604|Huambo|Rodríguez de Mendoza|Amazonas|2287
010605|Limabamba|Rodríguez de Mendoza|Amazonas|2194
010606|Longar|Rodríguez de Mendoza|Amazonas|1540
010607|Mariscal Benavides|Rodríguez de Mendoza|Amazonas|1456
010608|Milpuc|Rodríguez de Mendoza|Amazonas|387
010609|Omia|Rodríguez de Mendoza|Amazonas|10385
010610|Santa Rosa|Rodríguez de Mendoza|Amazonas|523
010611|Totora|Rodríguez de Mendoza|Amazonas|283
010612|Vista Alegre|Rodríguez de Mendoza|Amazonas|5180
010701|Bagua Grande|Utcubamba|Amazonas|60434
010702|Cajaruro|Utcubamba|Amazonas|22864
010703|Cumba|Utcubamba|Amazonas|8361
010704|El Milagro|Utcubamba|Amazonas|6586
010705|Jamalca|Utcubamba|Amazonas|6855
010706|Lonya Grande|Utcubamba|Amazonas|11763
010707|Yamón|Utcubamba|Amazonas|3258
020101|Huaraz|Huaraz|Áncash|71323
020102|Cochabamba|Huaraz|Áncash|1638
020103|Colcabamba|Huaraz|Áncash|234
020104|Huanchay|Huaraz|Áncash|1566
020105|Independencia|Huaraz|Áncash|95535
020106|Jangas|Huaraz|Áncash|5366
020107|La Libertad|Huaraz|Áncash|1079
020108|Olleros|Huaraz|Áncash|2481
020109|Pampas Grande|Huaraz|Áncash|948
020110|Pariacoto|Huaraz|Áncash|5418
020111|Pira|Huaraz|Áncash|3414
020112|Tarica|Huaraz|Áncash|8277
020201|Aija|Aija|Áncash|2158
020202|Coris|Aija|Áncash|1369
020203|Huacllán|Aija|Áncash|281
020204|La Merced|Aija|Áncash|1266
020205|Succha|Aija|Áncash|660
020301|Llamellín|Antonio Raymondi|Áncash|3159
020302|Aczo|Antonio Raymondi|Áncash|1696
020303|Chaccho|Antonio Raymondi|Áncash|1197
020304|Chingas|Antonio Raymondi|Áncash|1666
020305|Mirgas|Antonio Raymondi|Áncash|3754
020306|San Juan de Rontoy|Antonio Raymondi|Áncash|1032
020401|Chacas|Asunción|Áncash|4447
020402|Acochaca|Asunción|Áncash|2578
020501|Chiquián|Bolognesi|Áncash|3777
020502|Abelardo Pardo Lezameta|Bolognesi|Áncash|183
020503|Antonio Raymondi|Bolognesi|Áncash|865
020504|Aquia|Bolognesi|Áncash|1714
020505|Cajacay|Bolognesi|Áncash|1914
020506|Canis|Bolognesi|Áncash|209
020507|Colquioc|Bolognesi|Áncash|1953
020508|Huallanca|Bolognesi|Áncash|5931
020509|Huasta|Bolognesi|Áncash|1052
020510|Huayllacayán|Bolognesi|Áncash|1169
020511|La Primavera|Bolognesi|Áncash|342
020512|Mangas|Bolognesi|Áncash|440
020513|Pacllón|Bolognesi|Áncash|691
020514|San Miguel de Corpanqui|Bolognesi|Áncash|375
020515|Ticllos|Bolognesi|Áncash|511
020601|Carhuaz|Carhuaz|Áncash|17155
020602|Acopampa|Carhuaz|Áncash|2829
020603|Amashca|Carhuaz|Áncash|1434
020604|Anta|Carhuaz|Áncash|2619
020605|Ataquero|Carhuaz|Áncash|1640
020606|Marcará|Carhuaz|Áncash|11321
020607|Pariahuanca|Carhuaz|Áncash|1440
020608|San Miguel de Aco|Carhuaz|Áncash|2480
020609|Shilla|Carhuaz|Áncash|2843
020610|Tinco|Carhuaz|Áncash|4146
020611|Yungar|Carhuaz|Áncash|3306
020701|San Luis|Carlos Fermín Fitzcarrald|Áncash|10347
020702|San Nicolás|Carlos Fermín Fitzcarrald|Áncash|2868
020703|Yauya|Carlos Fermín Fitzcarrald|Áncash|3645
020801|Casma|Casma|Áncash|44792
020802|Buena Vista Alta|Casma|Áncash|5963
020803|Comandante Noél|Casma|Áncash|2405
020804|Yaután|Casma|Áncash|9693
020901|Corongo|Corongo|Áncash|1798
020902|Aco|Corongo|Áncash|307
020903|Bambas|Corongo|Áncash|426
020904|Cusca|Corongo|Áncash|2911
020905|La Pampa|Corongo|Áncash|972
020906|Yánac|Corongo|Áncash|587
020907|Yupán|Corongo|Áncash|665
021001|Huari|Huari|Áncash|9756
021002|Anra|Huari|Áncash|1283
021003|Cajay|Huari|Áncash|2576
021004|Chavín de Huántar|Huari|Áncash|8415
021005|Huacachi|Huari|Áncash|1818
021006|Huacchis|Huari|Áncash|1216
021007|Huachis|Huari|Áncash|3649
021008|Huántar|Huari|Áncash|2705
021009|Masín|Huari|Áncash|1193
021010|Paucas|Huari|Áncash|1408
021011|Ponto|Huari|Áncash|2499
021012|Rahuapampa|Huari|Áncash|776
021013|Rapayan|Huari|Áncash|1372
021014|San Marcos|Huari|Áncash|20749
021015|San Pedro de Chana|Huari|Áncash|2745
021016|Uco|Huari|Áncash|1176
021101|Huarmey|Huarmey|Áncash|28519
021102|Cochapeti|Huarmey|Áncash|761
021103|Culebras|Huarmey|Áncash|3445
021104|Huayán|Huarmey|Áncash|935
021105|Malvas|Huarmey|Áncash|720
021201|Caraz|Huaylas|Áncash|27501
021202|Huallanca|Huaylas|Áncash|1157
021203|Huata|Huaylas|Áncash|1360
021204|Huaylas|Huaylas|Áncash|1663
021205|Mato|Huaylas|Áncash|1853
021206|Pamparomás|Huaylas|Áncash|8556
021207|Pueblo Libre|Huaylas|Áncash|7007
021208|Santa Cruz|Huaylas|Áncash|4539
021209|Santo Toribio|Huaylas|Áncash|1046
021210|Yuracmarca|Huaylas|Áncash|2292
021301|Piscobamba|Mariscal Luzuriaga|Áncash|2946
021302|Casca|Mariscal Luzuriaga|Áncash|3713
021303|Eleazar Guzmán Barrón|Mariscal Luzuriaga|Áncash|1334
021304|Fidel Olivas Escudero|Mariscal Luzuriaga|Áncash|1704
021305|Llama|Mariscal Luzuriaga|Áncash|902
021306|Llumpa|Mariscal Luzuriaga|Áncash|6439
021307|Lucma|Mariscal Luzuriaga|Áncash|2642
021308|Musga|Mariscal Luzuriaga|Áncash|919
021401|Ocros|Ocros|Áncash|1149
021402|Acas|Ocros|Áncash|498
021403|Cajamarquilla|Ocros|Áncash|241
021404|Carhuapampa|Ocros|Áncash|335
021405|Cochas|Ocros|Áncash|1594
021406|Congas|Ocros|Áncash|1206
021407|Llipa|Ocros|Áncash|209
021408|San Cristóbal de Raján|Ocros|Áncash|305
021409|San Pedro|Ocros|Áncash|369
021410|Santiago de Chilcas|Ocros|Áncash|467
021501|Cabana|Pallasca|Áncash|2401
021502|Bolognesi|Pallasca|Áncash|867
021503|Conchucos|Pallasca|Áncash|7437
021504|Huacaschuque|Pallasca|Áncash|465
021505|Huandoval|Pallasca|Áncash|1015
021506|Lacabamba|Pallasca|Áncash|451
021507|Llapo|Pallasca|Áncash|577
021508|Pallasca|Pallasca|Áncash|2374
021509|Pampas|Pallasca|Áncash|2721
021510|Santa Rosa|Pallasca|Áncash|1098
021511|Tauca|Pallasca|Áncash|2535
021601|Pomabamba|Pomabamba|Áncash|14554
021602|Huayllán|Pomabamba|Áncash|2732
021603|Parobamba|Pomabamba|Áncash|5960
021604|Quinuabamba|Pomabamba|Áncash|2177
021701|Recuay|Recuay|Áncash|4093
021702|Cátac|Recuay|Áncash|3832
021703|Cotaparaco|Recuay|Áncash|312
021704|Huayllapampa|Recuay|Áncash|412
021705|Llacllin|Recuay|Áncash|661
021706|Marca|Recuay|Áncash|2271
021707|Pampas Chico|Recuay|Áncash|624
021708|Pararín|Recuay|Áncash|1820
021709|Tapacocha|Recuay|Áncash|376
021710|Ticapampa|Recuay|Áncash|2781
021801|Chimbote|Santa|Áncash|214571
021802|Cáceres del Perú|Santa|Áncash|4573
021803|Coishco|Santa|Áncash|17777
021804|Macate|Santa|Áncash|2964
021805|Moro|Santa|Áncash|8860
021806|Nepeña|Santa|Áncash|14871
021807|Samanco|Santa|Áncash|5498
021808|Santa|Santa|Áncash|24031
021809|Nuevo Chimbote|Santa|Áncash|201129
021901|Sihuas|Sihuas|Áncash|5748
021902|Acobamba|Sihuas|Áncash|1445
021903|Alfonso Ugarte|Sihuas|Áncash|395
021904|Cashapampa|Sihuas|Áncash|2748
021905|Chingalpo|Sihuas|Áncash|793
021906|Huayllabamba|Sihuas|Áncash|3326
021907|Quiches|Sihuas|Áncash|2147
021908|Ragash|Sihuas|Áncash|2155
021909|San Juan|Sihuas|Áncash|6984
021910|Sicsibamba|Sihuas|Áncash|1295
022001|Yungay|Yungay|Áncash|23108
022002|Cascapara|Yungay|Áncash|1553
022003|Mancos|Yungay|Áncash|6699
022004|Matacoto|Yungay|Áncash|1559
022005|Quillo|Yungay|Áncash|13439
022006|Ranrahirca|Yungay|Áncash|2993
022007|Shupluy|Yungay|Áncash|1750
022008|Yanama|Yungay|Áncash|4760
030101|Abancay|Abancay|Apurímac|80789
030102|Chacoche|Abancay|Apurímac|1463
030103|Circa|Abancay|Apurímac|1714
030104|Curahuasi|Abancay|Apurímac|17018
030105|Huanipaca|Abancay|Apurímac|2205
030106|Lambrama|Abancay|Apurímac|2161
030107|Pichirhua|Abancay|Apurímac|2158
030108|San Pedro de Cachora|Abancay|Apurímac|2078
030109|Tamburco|Abancay|Apurímac|12624
030201|Andahuaylas|Andahuaylas|Apurímac|50078
030202|Andarapa|Andahuaylas|Apurímac|5164
030203|Chiara|Andahuaylas|Apurímac|1144
030204|Huancarama|Andahuaylas|Apurímac|4309
030205|Huancaray|Andahuaylas|Apurímac|3591
030206|Huayana|Andahuaylas|Apurímac|666
030207|Kishuara|Andahuaylas|Apurímac|5290
030208|Pacobamba|Andahuaylas|Apurímac|2769
030209|Pacucha|Andahuaylas|Apurímac|7706
030210|Pampachiri|Andahuaylas|Apurímac|2190
030211|Pomacocha|Andahuaylas|Apurímac|847
030212|San Antonio de Cachi|Andahuaylas|Apurímac|2887
030213|San Jerónimo|Andahuaylas|Apurímac|22690
030214|San Miguel de Chaccrampa|Andahuaylas|Apurímac|1554
030215|Santa María de Chicmo|Andahuaylas|Apurímac|8128
030216|Talavera|Andahuaylas|Apurímac|21054
030217|Tumay Huaraca|Andahuaylas|Apurímac|1796
030218|Turpo|Andahuaylas|Apurímac|3559
030219|Kaquiabamba|Andahuaylas|Apurímac|1493
030220|José María Arguedas|Andahuaylas|Apurímac|5478
030301|Antabamba|Antabamba|Apurímac|2537
030302|El Oro|Antabamba|Apurímac|618
030303|Huaquirca|Antabamba|Apurímac|2138
030304|Juan Espinoza Medrano|Antabamba|Apurímac|1526
030305|Oropesa|Antabamba|Apurímac|2074
030306|Pachaconas|Antabamba|Apurímac|963
030307|Sabaino|Antabamba|Apurímac|898
030401|Chalhuanca|Aymaraes|Apurímac|5217
030402|Capaya|Aymaraes|Apurímac|486
030403|Caraybamba|Aymaraes|Apurímac|727
030404|Chapimarca|Aymaraes|Apurímac|1643
030405|Colcabamba|Aymaraes|Apurímac|581
030406|Cotaruse|Aymaraes|Apurímac|1936
030407|Ihuayllo|Aymaraes|Apurímac|385
030408|Justo Apu Sahuaraura|Aymaraes|Apurímac|607
030409|Lucre|Aymaraes|Apurímac|1105
030410|Pocohuanca|Aymaraes|Apurímac|930
030411|San Juan de Chacña|Aymaraes|Apurímac|638
030412|Sañayca|Aymaraes|Apurímac|963
030413|Soraya|Aymaraes|Apurímac|600
030414|Tapairihua|Aymaraes|Apurímac|1693
030415|Tintay|Aymaraes|Apurímac|1762
030416|Toraya|Aymaraes|Apurímac|967
030417|Yanaca|Aymaraes|Apurímac|833
030501|Tambobamba|Cotabambas|Apurímac|10385
030502|Cotabambas|Cotabambas|Apurímac|3922
030503|Coyllurqui|Cotabambas|Apurímac|6427
030504|Haquira|Cotabambas|Apurímac|9320
030505|Mara|Cotabambas|Apurímac|5967
030506|Challhuahuacho|Cotabambas|Apurímac|19692
030601|Chincheros|Chincheros|Apurímac|5342
030602|Anco-Huallo|Chincheros|Apurímac|9886
030603|Cocharcas|Chincheros|Apurímac|1670
030604|Huaccana|Chincheros|Apurímac|5073
030605|Ocobamba|Chincheros|Apurímac|6597
030606|Ongoy|Chincheros|Apurímac|2185
030607|Uranmarca|Chincheros|Apurímac|2642
030608|Ranracancha|Chincheros|Apurímac|3907
030609|Rocchacc|Chincheros|Apurímac|2682
030610|El Porvenir|Chincheros|Apurímac|1698
030611|Los Chankas|Chincheros|Apurímac|1029
030612|Ahuayro|Chincheros|Apurímac|1026
030701|Chuquibambilla|Grau|Apurímac|4626
030702|Curpahuasi|Grau|Apurímac|1671
030703|Gamarra|Grau|Apurímac|2126
030704|Huayllati|Grau|Apurímac|1083
030705|Mamara|Grau|Apurímac|800
030706|Micaela Bastidas|Grau|Apurímac|724
030707|Pataypampa|Grau|Apurímac|654
030708|Progreso|Grau|Apurímac|3250
030709|San Antonio|Grau|Apurímac|222
030710|Santa Rosa|Grau|Apurímac|466
030711|Turpay|Grau|Apurímac|546
030712|Vilcabamba|Grau|Apurímac|1311
030713|Virundo|Grau|Apurímac|493
030714|Curasco|Grau|Apurímac|1054
040101|Arequipa|Arequipa|Arequipa|54262
040102|Alto Selva Alegre|Arequipa|Arequipa|96351
040103|Cayma|Arequipa|Arequipa|115881
040104|Cerro Colorado|Arequipa|Arequipa|259214
040105|Characato|Arequipa|Arequipa|19872
040106|Chiguata|Arequipa|Arequipa|3382
040107|Jacobo Hunter|Arequipa|Arequipa|55832
040108|La Joya|Arequipa|Arequipa|45683
040109|Mariano Melgar|Arequipa|Arequipa|70154
040110|Miraflores|Arequipa|Arequipa|69725
040111|Mollebaya|Arequipa|Arequipa|8826
040112|Paucarpata|Arequipa|Arequipa|139513
040113|Pocsi|Arequipa|Arequipa|422
040114|Polobaya|Arequipa|Arequipa|672
040115|Quequeña|Arequipa|Arequipa|8711
040116|Sabandia|Arequipa|Arequipa|5020
040117|Sachaca|Arequipa|Arequipa|32152
040118|San Juan de Siguas|Arequipa|Arequipa|479
040119|San Juan de Tarucani|Arequipa|Arequipa|1134
040120|Santa Isabel de Siguas|Arequipa|Arequipa|566
040121|Santa Rita de Siguas|Arequipa|Arequipa|9168
040122|Socabaya|Arequipa|Arequipa|92001
040123|Tiabaya|Arequipa|Arequipa|18026
040124|Uchumayo|Arequipa|Arequipa|19147
040125|Vitor|Arequipa|Arequipa|5523
040126|Yanahuara|Arequipa|Arequipa|27815
040127|Yarabamba|Arequipa|Arequipa|1797
040128|Yura|Arequipa|Arequipa|49354
040129|José Luis Bustamante y Rivero|Arequipa|Arequipa|85243
040201|Camaná|Camaná|Arequipa|11945
040202|José María Quimper|Camaná|Arequipa|4910
040203|Mariano Nicolás Valcárcel|Camaná|Arequipa|10517
040204|Mariscal Cáceres|Camaná|Arequipa|6677
040205|Nicolás de Piérola|Camaná|Arequipa|8231
040206|Ocoña|Camaná|Arequipa|3863
040207|Quilca|Camaná|Arequipa|1169
040208|Samuel Pastor|Camaná|Arequipa|17607
040301|Caravelí|Caravelí|Arequipa|4454
040302|Acarí|Caravelí|Arequipa|4112
040303|Atico|Caravelí|Arequipa|6639
040304|Atiquipa|Caravelí|Arequipa|431
040305|Bella Unión|Caravelí|Arequipa|4301
040306|Cahuacho|Caravelí|Arequipa|566
040307|Chala|Caravelí|Arequipa|11472
040308|Chaparra|Caravelí|Arequipa|3346
040309|Huanuhuanu|Caravelí|Arequipa|3482
040310|Jaqui|Caravelí|Arequipa|1593
040311|Lomas|Caravelí|Arequipa|1684
040312|Quicacha|Caravelí|Arequipa|1915
040313|Yauca|Caravelí|Arequipa|2145
040401|Aplao|Castilla|Arequipa|9116
040402|Andagua|Castilla|Arequipa|928
040403|Ayo|Castilla|Arequipa|195
040404|Chachas|Castilla|Arequipa|1482
040405|Chilcaymarca|Castilla|Arequipa|1135
040406|Choco|Castilla|Arequipa|545
040407|Huancarqui|Castilla|Arequipa|1664
040408|Machaguay|Castilla|Arequipa|339
040409|Orcopampa|Castilla|Arequipa|8829
040410|Pampacolca|Castilla|Arequipa|1510
040411|Tipán|Castilla|Arequipa|384
040412|Uñón|Castilla|Arequipa|193
040413|Uraca|Castilla|Arequipa|6182
040414|Viraco|Castilla|Arequipa|1370
040501|Chivay|Caylloma|Arequipa|5741
040502|Achoma|Caylloma|Arequipa|804
040503|Cabanaconde|Caylloma|Arequipa|1997
040504|Callalli|Caylloma|Arequipa|1215
040505|Caylloma|Caylloma|Arequipa|3578
040506|Coporaque|Caylloma|Arequipa|1109
040507|Huambo|Caylloma|Arequipa|630
040508|Huanca|Caylloma|Arequipa|946
040509|Ichupampa|Caylloma|Arequipa|561
040510|Lari|Caylloma|Arequipa|758
040511|Lluta|Caylloma|Arequipa|672
040512|Maca|Caylloma|Arequipa|660
040513|Madrigal|Caylloma|Arequipa|643
040514|San Antonio de Chuca|Caylloma|Arequipa|823
040515|Sibayo|Caylloma|Arequipa|666
040516|Tapay|Caylloma|Arequipa|949
040517|Tisco|Caylloma|Arequipa|1471
040518|Tuti|Caylloma|Arequipa|554
040519|Yanque|Caylloma|Arequipa|2086
040520|Majes|Caylloma|Arequipa|80557
040601|Chuquibamba|Condesuyos|Arequipa|3314
040602|Andaray|Condesuyos|Arequipa|649
040603|Cayarani|Condesuyos|Arequipa|3208
040604|Chichas|Condesuyos|Arequipa|624
040605|Iray|Condesuyos|Arequipa|561
040606|Río Grande|Condesuyos|Arequipa|3467
040607|Salamanca|Condesuyos|Arequipa|319
040608|Yanaquihua|Condesuyos|Arequipa|3656
040701|Mollendo|Islay|Arequipa|27336
040702|Cocachacra|Islay|Arequipa|8187
040703|Dean Valdivia|Islay|Arequipa|7415
040704|Islay|Islay|Arequipa|5353
040705|Mejía|Islay|Arequipa|1292
040706|Punta de Bombón|Islay|Arequipa|6409
040801|Cotahuasi|La Unión|Arequipa|2985
040802|Alca|La Unión|Arequipa|1757
040803|Charcana|La Unión|Arequipa|568
040804|Huaynacotas|La Unión|Arequipa|1700
040805|Pampamarca|La Unión|Arequipa|1013
040806|Puyca|La Unión|Arequipa|2198
040807|Quechualla|La Unión|Arequipa|282
040808|Sayla|La Unión|Arequipa|249
040809|Tauria|La Unión|Arequipa|303
040810|Tomepampa|La Unión|Arequipa|591
040811|Toro|La Unión|Arequipa|424
050101|Ayacucho|Huamanga|Ayacucho|115393
050102|Acocro|Huamanga|Ayacucho|9361
050103|Acos Vinchos|Huamanga|Ayacucho|5163
050104|Carmen Alto|Huamanga|Ayacucho|32883
050105|Chiara|Huamanga|Ayacucho|7062
050106|Ocros|Huamanga|Ayacucho|6457
050107|Pacaycasa|Huamanga|Ayacucho|3725
050108|Quinua|Huamanga|Ayacucho|6084
050109|San José de Ticllas|Huamanga|Ayacucho|1663
050110|San Juan Bautista|Huamanga|Ayacucho|55479
050111|Santiago de Pischa|Huamanga|Ayacucho|1714
050112|Socos|Huamanga|Ayacucho|7167
050113|Tambillo|Huamanga|Ayacucho|6364
050114|Vinchos|Huamanga|Ayacucho|17231
050115|Jesús Nazareno|Huamanga|Ayacucho|21917
050116|Andrés Avelino Cáceres Dorregaray|Huamanga|Ayacucho|32326
050201|Cangallo|Cangallo|Ayacucho|5320
050202|Chuschi|Cangallo|Ayacucho|9292
050203|Los Morochucos|Cangallo|Ayacucho|8016
050204|María Parado de Bellido|Cangallo|Ayacucho|1713
050205|Paras|Cangallo|Ayacucho|3877
050206|Totos|Cangallo|Ayacucho|2580
050301|Sancos|Huanca Sancos|Ayacucho|3095
050302|Carapo|Huanca Sancos|Ayacucho|1620
050303|Sacsamarca|Huanca Sancos|Ayacucho|1215
050304|Santiago de Lucanamarca|Huanca Sancos|Ayacucho|1959
050401|Huanta|Huanta|Ayacucho|45669
050402|Ayahuanco|Huanta|Ayacucho|877
050403|Huamanguilla|Huanta|Ayacucho|3748
050404|Iguain|Huanta|Ayacucho|2842
050405|Luricocha|Huanta|Ayacucho|6565
050406|Santillana|Huanta|Ayacucho|3318
050407|Sivia|Huanta|Ayacucho|11014
050408|Llochegua|Huanta|Ayacucho|12017
050409|Canayre|Huanta|Ayacucho|5041
050410|Uchuraccay|Huanta|Ayacucho|3274
050411|Pucacolpa|Huanta|Ayacucho|1695
050412|Chaca|Huanta|Ayacucho|2041
050413|Putis|Huanta|Ayacucho|250
050501|San Miguel|La Mar|Ayacucho|8334
050502|Anco|La Mar|Ayacucho|5127
050503|Ayna|La Mar|Ayacucho|9712
050504|Chilcas|La Mar|Ayacucho|1281
050505|Chungui|La Mar|Ayacucho|4149
050506|Luis Carranza|La Mar|Ayacucho|1401
050507|Santa Rosa|La Mar|Ayacucho|12917
050508|Tambo|La Mar|Ayacucho|6465
050509|Samugari|La Mar|Ayacucho|9349
050510|Anchihuay|La Mar|Ayacucho|3926
050511|Oronccoy|La Mar|Ayacucho|963
050512|Unión Progreso|La Mar|Ayacucho|1985
050513|Río Magdalena|La Mar|Ayacucho|2322
050514|Ninabamba|La Mar|Ayacucho|1912
050515|Patibamba|La Mar|Ayacucho|1497
050601|Puquio|Lucanas|Ayacucho|14505
050602|Aucara|Lucanas|Ayacucho|2342
050603|Cabana|Lucanas|Ayacucho|1738
050604|Carmen Salcedo|Lucanas|Ayacucho|1251
050605|Chaviña|Lucanas|Ayacucho|2261
050606|Chipao|Lucanas|Ayacucho|2157
050607|Huac-Huas|Lucanas|Ayacucho|1348
050608|Laramate|Lucanas|Ayacucho|1613
050609|Leoncio Prado|Lucanas|Ayacucho|995
050610|Llauta|Lucanas|Ayacucho|783
050611|Lucanas|Lucanas|Ayacucho|2478
050612|Ocaña|Lucanas|Ayacucho|2010
050613|Otoca|Lucanas|Ayacucho|1628
050614|Saisa|Lucanas|Ayacucho|833
050615|San Cristóbal|Lucanas|Ayacucho|1780
050616|San Juan|Lucanas|Ayacucho|949
050617|San Pedro|Lucanas|Ayacucho|2508
050618|San Pedro de Palco|Lucanas|Ayacucho|786
050619|Sancos|Lucanas|Ayacucho|4684
050620|Santa Ana de Huaycahuacho|Lucanas|Ayacucho|866
050621|Santa Lucia|Lucanas|Ayacucho|1518
050701|Coracora|Parinacochas|Ayacucho|12618
050702|Chumpi|Parinacochas|Ayacucho|1852
050703|Coronel Castañeda|Parinacochas|Ayacucho|2193
050704|Pacapausa|Parinacochas|Ayacucho|403
050705|Pullo|Parinacochas|Ayacucho|8222
050706|Puyusca|Parinacochas|Ayacucho|1963
050707|San Francisco de Rivacayco|Parinacochas|Ayacucho|449
050708|Upahuacho|Parinacochas|Ayacucho|844
050801|Pausa|Páucar del Sara Sara|Ayacucho|3399
050802|Colta|Páucar del Sara Sara|Ayacucho|329
050803|Corculla|Páucar del Sara Sara|Ayacucho|392
050804|Lampa|Páucar del Sara Sara|Ayacucho|1762
050805|Marcabamba|Páucar del Sara Sara|Ayacucho|548
050806|Oyolo|Páucar del Sara Sara|Ayacucho|1815
050807|Pararca|Páucar del Sara Sara|Ayacucho|300
050808|San Javier de Alpabamba|Páucar del Sara Sara|Ayacucho|205
050809|San José de Ushua|Páucar del Sara Sara|Ayacucho|266
050810|Sara Sara|Páucar del Sara Sara|Ayacucho|374
050901|Querobamba|Sucre|Ayacucho|2569
050902|Belén|Sucre|Ayacucho|278
050903|Chalcos|Sucre|Ayacucho|421
050904|Chilcayoc|Sucre|Ayacucho|449
050905|Huacaña|Sucre|Ayacucho|312
050906|Morcolla|Sucre|Ayacucho|1178
050907|Paico|Sucre|Ayacucho|461
050908|San Pedro de Larcay|Sucre|Ayacucho|784
050909|San Salvador de Quije|Sucre|Ayacucho|839
050910|Santiago de Paucaray|Sucre|Ayacucho|513
050911|Soras|Sucre|Ayacucho|976
051001|Huancapi|Víctor Fajardo|Ayacucho|1769
051002|Alcamenca|Víctor Fajardo|Ayacucho|1208
051003|Apongo|Víctor Fajardo|Ayacucho|469
051004|Asquipata|Víctor Fajardo|Ayacucho|474
051005|Canaria|Víctor Fajardo|Ayacucho|3998
051006|Cayara|Víctor Fajardo|Ayacucho|1092
051007|Colca|Víctor Fajardo|Ayacucho|975
051008|Huamanquiquia|Víctor Fajardo|Ayacucho|1069
051009|Huancaraylla|Víctor Fajardo|Ayacucho|1137
051010|Hualla|Víctor Fajardo|Ayacucho|1771
051011|Sarhua|Víctor Fajardo|Ayacucho|2536
051012|Vilcanchos|Víctor Fajardo|Ayacucho|2290
051101|Vilcas Huamán|Vilcas Huamán|Ayacucho|6229
051102|Accomarca|Vilcas Huamán|Ayacucho|782
051103|Carhuanca|Vilcas Huamán|Ayacucho|763
051104|Concepción|Vilcas Huamán|Ayacucho|1392
051105|Huambalpa|Vilcas Huamán|Ayacucho|1158
051106|Independencia|Vilcas Huamán|Ayacucho|999
051107|Saurama|Vilcas Huamán|Ayacucho|979
051108|Vischongo|Vilcas Huamán|Ayacucho|3816
060101|Cajamarca|Cajamarca|Cajamarca|252188
060102|Asunción|Cajamarca|Cajamarca|6531
060103|Chetilla|Cajamarca|Cajamarca|3754
060104|Cospán|Cajamarca|Cajamarca|6914
060105|Encañada|Cajamarca|Cajamarca|18314
060106|Jesús|Cajamarca|Cajamarca|16928
060107|Llacanora|Cajamarca|Cajamarca|6781
060108|Los Baños del Inca|Cajamarca|Cajamarca|58177
060109|Magdalena|Cajamarca|Cajamarca|8555
060110|Matara|Cajamarca|Cajamarca|3704
060111|Namora|Cajamarca|Cajamarca|10488
060112|San Juan|Cajamarca|Cajamarca|4395
060201|Cajabamba|Cajabamba|Cajamarca|35192
060202|Cachachi|Cajabamba|Cajamarca|25616
060203|Condebamba|Cajabamba|Cajamarca|15688
060204|Sitacocha|Cajabamba|Cajamarca|7597
060301|Celendín|Celendín|Cajamarca|30220
060302|Chumuch|Celendín|Cajamarca|2481
060303|Cortegana|Celendín|Cajamarca|6871
060304|Huasmín|Celendín|Cajamarca|9717
060305|Jorge Chávez|Celendín|Cajamarca|420
060306|José Gálvez|Celendín|Cajamarca|2631
060307|Miguel Iglesias|Celendín|Cajamarca|3489
060308|Oxamarca|Celendín|Cajamarca|5462
060309|Sorochuco|Celendín|Cajamarca|6519
060310|Sucre|Celendín|Cajamarca|5142
060311|Utco|Celendín|Cajamarca|1007
060312|La Libertad de Pallán|Celendín|Cajamarca|6422
060401|Chota|Chota|Cajamarca|52925
060402|Anguia|Chota|Cajamarca|2846
060403|Chadin|Chota|Cajamarca|3439
060404|Chiguirip|Chota|Cajamarca|3247
060405|Chimbán|Chota|Cajamarca|1831
060406|Choropampa|Chota|Cajamarca|1979
060407|Cochabamba|Chota|Cajamarca|5490
060408|Conchán|Chota|Cajamarca|5719
060409|Huambos|Chota|Cajamarca|8193
060410|Lajas|Chota|Cajamarca|11088
060411|Llama|Chota|Cajamarca|7074
060412|Miracosta|Chota|Cajamarca|3128
060413|Paccha|Chota|Cajamarca|4392
060414|Pion|Chota|Cajamarca|1089
060415|Querocoto|Chota|Cajamarca|8624
060416|San Juan de Licupis|Chota|Cajamarca|924
060417|Tacabamba|Chota|Cajamarca|15736
060418|Tocmoche|Chota|Cajamarca|833
060419|Chalamarca|Chota|Cajamarca|9288
060501|Contumazá|Contumazá|Cajamarca|7655
060502|Chilete|Contumazá|Cajamarca|2458
060503|Cupisnique|Contumazá|Cajamarca|1285
060504|Guzmango|Contumazá|Cajamarca|2811
060505|San Benito|Contumazá|Cajamarca|3628
060506|Santa Cruz de Toled|Contumazá|Cajamarca|986
060507|Tantarica|Contumazá|Cajamarca|2663
060508|Yonán|Contumazá|Cajamarca|6489
060601|Cutervo|Cutervo|Cajamarca|50915
060602|Callayuc|Cutervo|Cajamarca|9381
060603|Choros|Cutervo|Cajamarca|3206
060604|Cujillo|Cutervo|Cajamarca|2461
060605|La Ramada|Cutervo|Cajamarca|3751
060606|Pimpingos|Cutervo|Cajamarca|4784
060607|Querocotillo|Cutervo|Cajamarca|12435
060608|San Andrés de Cutervo|Cutervo|Cajamarca|3952
060609|San Juan de Cutervo|Cutervo|Cajamarca|1761
060610|San Luis de Lucma|Cutervo|Cajamarca|2708
060611|Santa Cruz|Cutervo|Cajamarca|2497
060612|Santo Domingo de La Capilla|Cutervo|Cajamarca|4878
060613|Santo Tomás|Cutervo|Cajamarca|7397
060614|Socota|Cutervo|Cajamarca|8649
060615|Toribio Casanova|Cutervo|Cajamarca|997
060701|Bambamarca|Hualgayoc|Cajamarca|61515
060702|Chugur|Hualgayoc|Cajamarca|2691
060703|Hualgayoc|Hualgayoc|Cajamarca|15697
060801|Jaén|Jaén|Cajamarca|110148
060802|Bellavista|Jaén|Cajamarca|16507
060803|Chontali|Jaén|Cajamarca|10512
060804|Colasay|Jaén|Cajamarca|10124
060805|Huabal|Jaén|Cajamarca|9065
060806|Las Pirias|Jaén|Cajamarca|4683
060807|Pomahuaca|Jaén|Cajamarca|9325
060808|Pucará|Jaén|Cajamarca|6903
060809|Sallique|Jaén|Cajamarca|7459
060810|San Felipe|Jaén|Cajamarca|4306
060811|San José del Alto|Jaén|Cajamarca|8185
060812|Santa Rosa|Jaén|Cajamarca|9525
060901|San Ignacio|San Ignacio|Cajamarca|42546
060902|Chirinos|San Ignacio|Cajamarca|16553
060903|Huarango|San Ignacio|Cajamarca|17260
060904|La Coipa|San Ignacio|Cajamarca|21625
060905|Namballe|San Ignacio|Cajamarca|9517
060906|San José de Lourdes|San Ignacio|Cajamarca|20025
060907|Tabaconas|San Ignacio|Cajamarca|20345
061001|Pedro Gálvez|San Marcos|Cajamarca|22715
061002|Chancay|San Marcos|Cajamarca|2982
061003|Eduardo Villanueva|San Marcos|Cajamarca|3393
061004|Gregorio Pita|San Marcos|Cajamarca|4545
061005|Ichocán|San Marcos|Cajamarca|1905
061006|José Manuel Quiroz|San Marcos|Cajamarca|3430
061007|José Sabogal|San Marcos|Cajamarca|13216
061101|San Miguel|San Miguel|Cajamarca|13234
061102|Bolívar|San Miguel|Cajamarca|1141
061103|Calquis|San Miguel|Cajamarca|4210
061104|Catilluc|San Miguel|Cajamarca|2543
061105|El Prado|San Miguel|Cajamarca|1510
061106|La Florida|San Miguel|Cajamarca|1986
061107|Llapa|San Miguel|Cajamarca|4123
061108|Nanchoc|San Miguel|Cajamarca|1352
061109|Niepos|San Miguel|Cajamarca|2731
061110|San Gregorio|San Miguel|Cajamarca|2159
061111|San Silvestre de Cochán|San Miguel|Cajamarca|3262
061112|Tongod|San Miguel|Cajamarca|1884
061113|Unión Agua Blanca|San Miguel|Cajamarca|2845
061201|San Pablo|San Pablo|Cajamarca|12877
061202|San Bernardino|San Pablo|Cajamarca|4318
061203|San Luis|San Pablo|Cajamarca|747
061204|Tumbadén|San Pablo|Cajamarca|3519
061301|Santa Cruz|Santa Cruz|Cajamarca|9325
061302|Andabamba|Santa Cruz|Cajamarca|1140
061303|Catache|Santa Cruz|Cajamarca|9729
061304|Chancaybaños|Santa Cruz|Cajamarca|3214
061305|La Esperanza|Santa Cruz|Cajamarca|2108
061306|Ninabamba|Santa Cruz|Cajamarca|1653
061307|Pulán|Santa Cruz|Cajamarca|3456
061308|Saucepampa|Santa Cruz|Cajamarca|1178
061309|Sexi|Santa Cruz|Cajamarca|403
061310|Uticyacu|Santa Cruz|Cajamarca|1092
061311|Yauyucán|Santa Cruz|Cajamarca|2603
070101|Callao|Callao|Callao|549626
070102|Bellavista|Callao|Callao|82009
070103|Carmen de La Legua Reynoso|Callao|Callao|47783
070104|La Perla|Callao|Callao|64945
070105|La Punta|Callao|Callao|3732
070106|Ventanilla|Callao|Callao|422286
070107|Mi Perú|Callao|Callao|58030
080101|Cusco|Cusco|Cusco|119732
080102|Ccorca|Cusco|Cusco|2416
080103|Poroy|Cusco|Cusco|14777
080104|San Jerónimo|Cusco|Cusco|81475
080105|San Sebastián|Cusco|Cusco|149718
080106|Santiago|Cusco|Cusco|108170
080107|Saylla|Cusco|Cusco|10034
080108|Wanchaq|Cusco|Cusco|61650
080201|Acomayo|Acomayo|Cusco|4479
080202|Acopia|Acomayo|Cusco|3153
080203|Acos|Acomayo|Cusco|2319
080204|Mosoc Llacta|Acomayo|Cusco|940
080205|Pomacanchi|Acomayo|Cusco|7479
080206|Rondocán|Acomayo|Cusco|1743
080207|Sangarara|Acomayo|Cusco|3343
080301|Anta|Anta|Cusco|27628
080302|Ancahuasi|Anta|Cusco|7943
080303|Cachimayo|Anta|Cusco|2909
080304|Chinchaypujio|Anta|Cusco|4244
080305|Huarocondo|Anta|Cusco|4409
080306|Limatambo|Anta|Cusco|7468
080307|Mollepata|Anta|Cusco|3617
080308|Pucyura|Anta|Cusco|3084
080309|Zurite|Anta|Cusco|3768
080401|Calca|Calca|Cusco|24188
080402|Coya|Calca|Cusco|3599
080403|Lamay|Calca|Cusco|6046
080404|Lares|Calca|Cusco|6205
080405|Pisac|Calca|Cusco|11997
080406|San Salvador|Calca|Cusco|6308
080407|Taray|Calca|Cusco|4969
080408|Yanatile|Calca|Cusco|9085
080501|Yanaoca|Canas|Cusco|9226
080502|Checca|Canas|Cusco|5412
080503|Kunturkanki|Canas|Cusco|5139
080504|Langui|Canas|Cusco|2014
080505|Layo|Canas|Cusco|5441
080506|Pampamarca|Canas|Cusco|1865
080507|Quehue|Canas|Cusco|2556
080508|Túpac Amaru|Canas|Cusco|2565
080601|Sicuani|Canchis|Cusco|66264
080602|Checacupe|Canchis|Cusco|5263
080603|Combapata|Canchis|Cusco|4972
080604|Marangani|Canchis|Cusco|10207
080605|Pitumarca|Canchis|Cusco|8605
080606|San Pablo|Canchis|Cusco|4349
080607|San Pedro|Canchis|Cusco|2759
080608|Tinta|Canchis|Cusco|5436
080701|Santo Tomás|Chumbivilcas|Cusco|22541
080702|Capacmarca|Chumbivilcas|Cusco|4037
080703|Chamaca|Chumbivilcas|Cusco|6288
080704|Colquemarca|Chumbivilcas|Cusco|6831
080705|Livitaca|Chumbivilcas|Cusco|13121
080706|Llusco|Chumbivilcas|Cusco|3964
080707|Quiñota|Chumbivilcas|Cusco|3964
080708|Velille|Chumbivilcas|Cusco|8649
080801|Espinar|Espinar|Cusco|41945
080802|Condoroma|Espinar|Cusco|800
080803|Coporaque|Espinar|Cusco|7992
080804|Ocoruro|Espinar|Cusco|846
080805|Pallpata|Espinar|Cusco|5021
080806|Pichigua|Espinar|Cusco|2565
080807|Suyckutambo|Espinar|Cusco|1258
080808|Alto Pichigua|Espinar|Cusco|1842
080901|Santa Ana|La Convención|Cusco|28908
080902|Echarate|La Convención|Cusco|17150
080903|Huayopata|La Convención|Cusco|5378
080904|Maranura|La Convención|Cusco|4764
080905|Ocobamba|La Convención|Cusco|5778
080906|Quellouno|La Convención|Cusco|15053
080907|Kimbiri|La Convención|Cusco|14360
080908|Santa Teresa|La Convención|Cusco|6894
080909|Vilcabamba|La Convención|Cusco|9822
080910|Pichari|La Convención|Cusco|25560
080911|Inkawasi|La Convención|Cusco|5249
080912|Villa Virgen|La Convención|Cusco|2501
080913|Villa Kintiarina|La Convención|Cusco|2442
080914|Megantoni|La Convención|Cusco|7335
080915|Kumpirushiato|La Convención|Cusco|5567
080916|Cielo Punco|La Convención|Cusco|2312
080917|Manitea|La Convención|Cusco|3704
080918|Unión Ashaninka|La Convención|Cusco|6243
081001|Paruro|Paruro|Cusco|3481
081002|Accha|Paruro|Cusco|3000
081003|Ccapi|Paruro|Cusco|2995
081004|Colcha|Paruro|Cusco|884
081005|Huanoquite|Paruro|Cusco|4999
081006|Omacha|Paruro|Cusco|5734
081007|Paccaritambo|Paruro|Cusco|2033
081008|Pillpinto|Paruro|Cusco|984
081009|Yaurisque|Paruro|Cusco|1818
081101|Paucartambo|Paucartambo|Cusco|13867
081102|Caicay|Paucartambo|Cusco|3210
081103|Challabamba|Paucartambo|Cusco|9337
081104|Colquepata|Paucartambo|Cusco|8795
081105|Huancarani|Paucartambo|Cusco|8055
081106|Kosñipata|Paucartambo|Cusco|4945
081201|Urcos|Quispicanchi|Cusco|12774
081202|Andahuaylillas|Quispicanchi|Cusco|7637
081203|Camanti|Quispicanchi|Cusco|2727
081204|Ccarhuayo|Quispicanchi|Cusco|3211
081205|Ccatca|Quispicanchi|Cusco|15207
081206|Cusipata|Quispicanchi|Cusco|4627
081207|Huaro|Quispicanchi|Cusco|5091
081208|Lucre|Quispicanchi|Cusco|5669
081209|Marcapata|Quispicanchi|Cusco|5029
081210|Ocongate|Quispicanchi|Cusco|19609
081211|Oropesa|Quispicanchi|Cusco|13087
081212|Quiquijana|Quispicanchi|Cusco|12176
081301|Urubamba|Urubamba|Cusco|25516
081302|Chinchero|Urubamba|Cusco|13115
081303|Huayllabamba|Urubamba|Cusco|6639
081304|Machupicchu|Urubamba|Cusco|5782
081305|Maras|Urubamba|Cusco|6865
081306|Ollantaytambo|Urubamba|Cusco|12154
081307|Yucay|Urubamba|Cusco|3461
090101|Huancavelica|Huancavelica|Huancavelica|43556
090102|Acobambilla|Huancavelica|Huancavelica|1379
090103|Acoria|Huancavelica|Huancavelica|12668
090104|Conayca|Huancavelica|Huancavelica|725
090105|Cuenca|Huancavelica|Huancavelica|826
090106|Huachocolpa|Huancavelica|Huancavelica|1436
090107|Huayllahuara|Huancavelica|Huancavelica|592
090108|Izcuchaca|Huancavelica|Huancavelica|912
090109|Laria|Huancavelica|Huancavelica|583
090110|Manta|Huancavelica|Huancavelica|718
090111|Mariscal Cáceres|Huancavelica|Huancavelica|415
090112|Moya|Huancavelica|Huancavelica|641
090113|Nuevo Occoro|Huancavelica|Huancavelica|1457
090114|Palca|Huancavelica|Huancavelica|1461
090115|Pilchaca|Huancavelica|Huancavelica|490
090116|Vilca|Huancavelica|Huancavelica|1447
090117|Yauli|Huancavelica|Huancavelica|16817
090118|Ascensión|Huancavelica|Huancavelica|22094
090119|Huando|Huancavelica|Huancavelica|5839
090201|Acobamba|Acobamba|Huancavelica|8758
090202|Andabamba|Acobamba|Huancavelica|2538
090203|Anta|Acobamba|Huancavelica|3321
090204|Caja|Acobamba|Huancavelica|1402
090205|Marcas|Acobamba|Huancavelica|1205
090206|Paucara|Acobamba|Huancavelica|5714
090207|Pomacocha|Acobamba|Huancavelica|2314
090208|Rosario|Acobamba|Huancavelica|4077
090301|Lircay|Angaraes|Huancavelica|24509
090302|Anchonga|Angaraes|Huancavelica|7155
090303|Callanmarca|Angaraes|Huancavelica|468
090304|Ccochaccasa|Angaraes|Huancavelica|2767
090305|Chincho|Angaraes|Huancavelica|770
090306|Congalla|Angaraes|Huancavelica|3226
090307|Huanca-Huanca|Angaraes|Huancavelica|1162
090308|Huayllay Grande|Angaraes|Huancavelica|733
090309|Julcamarca|Angaraes|Huancavelica|1805
090310|San Antonio de Antaparco|Angaraes|Huancavelica|1957
090311|Santo Tomás de Pata|Angaraes|Huancavelica|1238
090312|Secclla|Angaraes|Huancavelica|2914
090401|Castrovirreyna|Castrovirreyna|Huancavelica|2912
090402|Arma|Castrovirreyna|Huancavelica|778
090403|Aurahua|Castrovirreyna|Huancavelica|1238
090404|Capillas|Castrovirreyna|Huancavelica|734
090405|Chupamarca|Castrovirreyna|Huancavelica|824
090406|Cocas|Castrovirreyna|Huancavelica|634
090407|Huachos|Castrovirreyna|Huancavelica|634
090408|Huamatambo|Castrovirreyna|Huancavelica|388
090409|Mollepampa|Castrovirreyna|Huancavelica|1032
090410|San Juan|Castrovirreyna|Huancavelica|793
090411|Santa Ana|Castrovirreyna|Huancavelica|607
090412|Tantara|Castrovirreyna|Huancavelica|626
090413|Ticrapo|Castrovirreyna|Huancavelica|1408
090501|Churcampa|Churcampa|Huancavelica|5161
090502|Anco|Churcampa|Huancavelica|5365
090503|Chinchihuasi|Churcampa|Huancavelica|1379
090504|El Carmen|Churcampa|Huancavelica|2236
090505|La Merced|Churcampa|Huancavelica|1195
090506|Locroja|Churcampa|Huancavelica|2978
090507|Paucarbamba|Churcampa|Huancavelica|3360
090508|San Miguel de Mayocc|Churcampa|Huancavelica|618
090509|San Pedro de Coris|Churcampa|Huancavelica|3057
090510|Pachamarca|Churcampa|Huancavelica|1499
090511|Cosme|Churcampa|Huancavelica|2538
090601|Huaytará|Huaytará|Huancavelica|2293
090602|Ayavi|Huaytará|Huancavelica|789
090603|Córdova|Huaytará|Huancavelica|613
090604|Huayacundo Arma|Huaytará|Huancavelica|498
090605|Laramarca|Huaytará|Huancavelica|749
090606|Ocoyo|Huaytará|Huancavelica|476
090607|Pilpichaca|Huaytará|Huancavelica|2336
090608|Querco|Huaytará|Huancavelica|1359
090609|Quito-Arma|Huaytará|Huancavelica|603
090610|San Antonio de Cusicancha|Huaytará|Huancavelica|1241
090611|San Francisco de Sangayaico|Huaytará|Huancavelica|1090
090612|San Isidro|Huaytará|Huancavelica|1101
090613|Santiago de Chocorvos|Huaytará|Huancavelica|1053
090614|Santiago de Quirahuara|Huaytará|Huancavelica|241
090615|Santo Domingo de Capillas|Huaytará|Huancavelica|612
090616|Tambo|Huaytará|Huancavelica|940
090701|Pampas|Tayacaja|Huancavelica|11670
090702|Acostambo|Tayacaja|Huancavelica|2842
090703|Acraquia|Tayacaja|Huancavelica|2897
090704|Ahuaycha|Tayacaja|Huancavelica|3396
090705|Colcabamba|Tayacaja|Huancavelica|10899
090706|Daniel Hernández|Tayacaja|Huancavelica|10084
090707|Huachocolpa|Tayacaja|Huancavelica|2162
090709|Huaribamba|Tayacaja|Huancavelica|2535
090710|Ñahuimpuquio|Tayacaja|Huancavelica|1206
090711|Pazos|Tayacaja|Huancavelica|4266
090713|Quishuar|Tayacaja|Huancavelica|654
090714|Salcabamba|Tayacaja|Huancavelica|3453
090715|Salcahuasi|Tayacaja|Huancavelica|2275
090716|San Marcos de Rocchac|Tayacaja|Huancavelica|1364
090717|Surcubamba|Tayacaja|Huancavelica|3776
090718|Tintay Puncu|Tayacaja|Huancavelica|1265
090719|Quichuas|Tayacaja|Huancavelica|4012
090720|Andaymarca|Tayacaja|Huancavelica|2689
090721|Roble|Tayacaja|Huancavelica|869
090722|Pichos|Tayacaja|Huancavelica|1433
090723|Santiago de Tucuma|Tayacaja|Huancavelica|1367
090724|Lambras|Tayacaja|Huancavelica|1455
090725|Cochabamba|Tayacaja|Huancavelica|794
100101|Huánuco|Huánuco|Huánuco|98752
100102|Amarilis|Huánuco|Huánuco|93101
100103|Chinchao|Huánuco|Huánuco|12478
100104|Churubamba|Huánuco|Huánuco|11948
100105|Margos|Huánuco|Huánuco|3380
100106|Quisqui|Huánuco|Huánuco|2575
100107|San Francisco de Cayrán|Huánuco|Huánuco|4617
100108|San Pedro de Chaulan|Huánuco|Huánuco|2310
100109|Santa María del Valle|Huánuco|Huánuco|22439
100110|Yarumayo|Huánuco|Huánuco|1563
100111|Pillco Marca|Huánuco|Huánuco|58621
100112|Yacus|Huánuco|Huánuco|4483
100113|San Pablo de Pillao|Huánuco|Huánuco|7436
100201|Ambo|Ambo|Huánuco|24840
100202|Cayna|Ambo|Huánuco|1893
100203|Colpas|Ambo|Huánuco|1270
100204|Conchamarca|Ambo|Huánuco|3706
100205|Huacar|Ambo|Huánuco|7659
100206|San Francisco|Ambo|Huánuco|977
100207|San Rafael|Ambo|Huánuco|7385
100208|Tomay Kichwa|Ambo|Huánuco|2814
100301|La Unión|Dos de Mayo|Huánuco|7114
100307|Chuquis|Dos de Mayo|Huánuco|2402
100311|Marías|Dos de Mayo|Huánuco|4568
100313|Pachas|Dos de Mayo|Huánuco|3215
100316|Quivilla|Dos de Mayo|Huánuco|792
100317|Ripan|Dos de Mayo|Huánuco|4628
100321|Shunqui|Dos de Mayo|Huánuco|1210
100322|Sillapata|Dos de Mayo|Huánuco|1249
100323|Yanas|Dos de Mayo|Huánuco|1787
100401|Huacaybamba|Huacaybamba|Huánuco|5253
100402|Canchabamba|Huacaybamba|Huánuco|2505
100403|Cochabamba|Huacaybamba|Huánuco|1081
100404|Pinra|Huacaybamba|Huánuco|5636
100501|Llata|Huamalíes|Huánuco|12980
100502|Arancay|Huamalíes|Huánuco|1109
100503|Chavín de Pariarca|Huamalíes|Huánuco|3508
100504|Jacas Grande|Huamalíes|Huánuco|5409
100505|Jircan|Huamalíes|Huánuco|858
100506|Miraflores|Huamalíes|Huánuco|2836
100507|Monzón|Huamalíes|Huánuco|9568
100508|Punchao|Huamalíes|Huánuco|1751
100509|Puños|Huamalíes|Huánuco|3722
100510|Singa|Huamalíes|Huánuco|2574
100511|Tantamayo|Huamalíes|Huánuco|1284
100601|Rupa-Rupa|Leoncio Prado|Huánuco|61769
100602|Daniel Alomia Robles|Leoncio Prado|Huánuco|6899
100603|Hermilio Valdizán|Leoncio Prado|Huánuco|3506
100604|José Crespo y Castillo|Leoncio Prado|Huánuco|23994
100605|Luyando|Leoncio Prado|Huánuco|9541
100606|Mariano Damaso Beraún|Leoncio Prado|Huánuco|11549
100607|Pucayacu|Leoncio Prado|Huánuco|3936
100608|Castillo Grande|Leoncio Prado|Huánuco|14622
100609|Pueblo Nuevo|Leoncio Prado|Huánuco|4137
100610|Santo Domingo de Anda|Leoncio Prado|Huánuco|2427
100701|Huacrachuco|Marañón|Huánuco|14989
100702|Cholón|Marañón|Huánuco|5273
100703|San Buenaventura|Marañón|Huánuco|1839
100704|La Morada|Marañón|Huánuco|4154
100705|Santa Rosa de Alto Yanajanca|Marañón|Huánuco|2920
100801|Panao|Pachitea|Huánuco|17175
100802|Chaglla|Pachitea|Huánuco|8791
100803|Molino|Pachitea|Huánuco|9284
100804|Umari|Pachitea|Huánuco|8915
100901|Puerto Inca|Puerto Inca|Huánuco|11040
100902|Codo del Pozuzo|Puerto Inca|Huánuco|8857
100903|Honoria|Puerto Inca|Huánuco|4408
100904|Tournavista|Puerto Inca|Huánuco|6909
100905|Yuyapichis|Puerto Inca|Huánuco|6836
101001|Jesús|Lauricocha|Huánuco|3079
101002|Baños|Lauricocha|Huánuco|937
101003|Jivia|Lauricocha|Huánuco|644
101004|Queropalca|Lauricocha|Huánuco|691
101005|Rondos|Lauricocha|Huánuco|2279
101006|San Francisco de Asis|Lauricocha|Huánuco|813
101007|San Miguel de Cauri|Lauricocha|Huánuco|3899
101101|Chavinillo|Yarowilca|Huánuco|3682
101102|Cahuac|Yarowilca|Huánuco|664
101103|Chacabamba|Yarowilca|Huánuco|645
101104|Aparicio Pomares|Yarowilca|Huánuco|3836
101105|Jacas Chico|Yarowilca|Huánuco|737
101106|Obas|Yarowilca|Huánuco|2863
101107|Pampamarca|Yarowilca|Huánuco|681
101108|Choras|Yarowilca|Huánuco|1381
110101|Ica|Ica|Ica|189946
110102|La Tinguiña|Ica|Ica|53650
110103|Los Aquijes|Ica|Ica|28470
110104|Ocucaje|Ica|Ica|5893
110105|Pachacútec|Ica|Ica|9381
110106|Parcona|Ica|Ica|64373
110107|Pueblo Nuevo|Ica|Ica|9131
110108|Salas|Ica|Ica|33472
110109|San José de Los Molinos|Ica|Ica|8906
110110|San Juan Bautista|Ica|Ica|16952
110111|Santiago|Ica|Ica|34224
110112|Subtanjalla|Ica|Ica|36130
110113|Tate|Ica|Ica|5687
110114|Yauca Del Rosario|Ica|Ica|1350
110201|Chincha Alta|Chincha|Ica|83871
110202|Alto Laran|Chincha|Ica|9971
110203|Chavín|Chincha|Ica|3683
110204|Chincha Baja|Chincha|Ica|15285
110205|El Carmen|Chincha|Ica|14534
110206|Grocio Prado|Chincha|Ica|32403
110207|Pueblo Nuevo|Chincha|Ica|81998
110208|San Juan de Yánac|Chincha|Ica|2499
110209|San Pedro de Huacarpana|Chincha|Ica|1162
110210|Sunampe|Chincha|Ica|36625
110211|Tambo de Mora|Chincha|Ica|7309
110301|Nasca|Nasca|Ica|32259
110302|Changuillo|Nasca|Ica|2347
110303|El Ingenio|Nasca|Ica|3977
110304|Marcona|Nasca|Ica|20803
110305|Vista Alegre|Nasca|Ica|27612
110401|Palpa|Palpa|Ica|9263
110402|Llipata|Palpa|Ica|1924
110403|Río Grande|Palpa|Ica|3073
110404|Santa Cruz|Palpa|Ica|1048
110405|Tibillo|Palpa|Ica|352
110501|Pisco|Pisco|Ica|88467
110502|Huancano|Pisco|Ica|1426
110503|Humay|Pisco|Ica|6022
110504|Independencia|Pisco|Ica|15397
110505|Paracas|Pisco|Ica|11739
110506|San Andrés|Pisco|Ica|17118
110507|San Clemente|Pisco|Ica|33037
110508|Túpac Amaru Inca|Pisco|Ica|20797
120101|Huancayo|Huancayo|Junín|126618
120104|Carhuacallanga|Huancayo|Junín|389
120105|Chacapampa|Huancayo|Junín|844
120106|Chicche|Huancayo|Junín|562
120107|Chilca|Huancayo|Junín|104922
120108|Chongos Alto|Huancayo|Junín|1416
120111|Chupuro|Huancayo|Junín|2003
120112|Colca|Huancayo|Junín|943
120113|Cullhuas|Huancayo|Junín|1138
120114|El Tambo|Huancayo|Junín|180415
120116|Huacrapuquio|Huancayo|Junín|1341
120117|Hualhuas|Huancayo|Junín|6160
120119|Huancán|Huancayo|Junín|34295
120120|Huasicancha|Huancayo|Junín|768
120121|Huayucachi|Huancayo|Junín|11161
120122|Ingenio|Huancayo|Junín|2281
120124|Pariahuanca|Huancayo|Junín|4431
120125|Pilcomayo|Huancayo|Junín|27648
120126|Pucará|Huancayo|Junín|4455
120127|Quichuay|Huancayo|Junín|1832
120128|Quilcas|Huancayo|Junín|4128
120129|San Agustín|Huancayo|Junín|21764
120130|San Jerónimo de Tunán|Huancayo|Junín|13687
120132|Saño|Huancayo|Junín|6866
120133|Sapallanga|Huancayo|Junín|28774
120134|Sicaya|Huancayo|Junín|27748
120135|Santo Domingo de Acobamba|Huancayo|Junín|5574
120136|Viques|Huancayo|Junín|3074
120201|Concepción|Concepción|Junín|17514
120202|Aco|Concepción|Junín|1496
120203|Andamarca|Concepción|Junín|2627
120204|Chambará|Concepción|Junín|2501
120205|Cochas|Concepción|Junín|1833
120206|Comas|Concepción|Junín|4440
120207|Heroínas Toledo|Concepción|Junín|774
120208|Manzanares|Concepción|Junín|1494
120209|Mariscal Castilla|Concepción|Junín|1416
120210|Matahuasi|Concepción|Junín|6661
120211|Mito|Concepción|Junín|1420
120212|Nueve de Julio|Concepción|Junín|2850
120213|Orcotuna|Concepción|Junín|5623
120214|San José de Quero|Concepción|Junín|5296
120215|Santa Rosa de Ocopa|Concepción|Junín|2030
120301|Chanchamayo|Chanchamayo|Junín|29775
120302|Perené|Chanchamayo|Junín|61010
120303|Pichanaqui|Chanchamayo|Junín|39213
120304|San Luis de Shuaro|Chanchamayo|Junín|2981
120305|San Ramón|Chanchamayo|Junín|30214
120306|Vitoc|Chanchamayo|Junín|1450
120401|Jauja|Jauja|Junín|20779
120402|Acolla|Jauja|Junín|5196
120403|Apata|Jauja|Junín|4317
120404|Ataura|Jauja|Junín|1417
120405|Canchayllo|Jauja|Junín|1613
120406|Curicaca|Jauja|Junín|1309
120407|El Mantaro|Jauja|Junín|2787
120408|Huamalí|Jauja|Junín|1504
120409|Huaripampa|Jauja|Junín|1135
120410|Huertas|Jauja|Junín|2324
120411|Janjaillo|Jauja|Junín|491
120412|Julcán|Jauja|Junín|705
120413|Leonor Ordóñez|Jauja|Junín|1556
120414|Llocllapampa|Jauja|Junín|1087
120415|Marco|Jauja|Junín|1225
120416|Masma|Jauja|Junín|1573
120417|Masma Chicche|Jauja|Junín|664
120418|Molinos|Jauja|Junín|1496
120419|Monobamba|Jauja|Junín|2135
120420|Muqui|Jauja|Junín|1025
120421|Muquiyauyo|Jauja|Junín|2303
120422|Paca|Jauja|Junín|737
120423|Paccha|Jauja|Junín|1184
120424|Pancán|Jauja|Junín|1179
120425|Parco|Jauja|Junín|1006
120426|Pomacancha|Jauja|Junín|1127
120427|Ricrán|Jauja|Junín|1017
120428|San Lorenzo|Jauja|Junín|2967
120429|San Pedro de Chunán|Jauja|Junín|568
120430|Sausa|Jauja|Junín|3501
120431|Sincos|Jauja|Junín|4001
120432|Tunan Marca|Jauja|Junín|847
120433|Yauli|Jauja|Junín|859
120434|Yauyos|Jauja|Junín|10198
120501|Junín|Junín|Junín|10146
120502|Carhuamayo|Junín|Junín|5581
120503|Ondores|Junín|Junín|947
120504|Ulcumayo|Junín|Junín|3331
120601|Satipo|Satipo|Junín|44313
120602|Coviriali|Satipo|Junín|6834
120603|Llaylla|Satipo|Junín|8197
120604|Mazamari|Satipo|Junín|46348
120605|Pampa Hermosa|Satipo|Junín|2937
120606|Pangoa|Satipo|Junín|70079
120607|Río Negro|Satipo|Junín|36675
120608|Río Tambo|Satipo|Junín|27735
120609|Vizcatán del Ene|Satipo|Junín|7200
120701|Tarma|Tarma|Junín|48431
120702|Acobamba|Tarma|Junín|7833
120703|Huaricolca|Tarma|Junín|1416
120704|Huasahuasi|Tarma|Junín|7808
120705|La Unión|Tarma|Junín|3457
120706|Palca|Tarma|Junín|5578
120707|Palcamayo|Tarma|Junín|2480
120708|San Pedro de Cajas|Tarma|Junín|2686
120709|Tapo|Tarma|Junín|3870
120801|La Oroya|Yauli|Junín|11824
120802|Chacapalpa|Yauli|Junín|578
120803|Huay-Huay|Yauli|Junín|2339
120804|Marcapomacocha|Yauli|Junín|650
120805|Morococha|Yauli|Junín|5189
120806|Paccha|Yauli|Junín|1541
120807|Santa Bárbara de Carhuacayán|Yauli|Junín|769
120808|Santa Rosa de Sacco|Yauli|Junín|7577
120809|Suitucancha|Yauli|Junín|634
120810|Yauli|Yauli|Junín|5154
120901|Chupaca|Chupaca|Junín|21329
120902|Ahuac|Chupaca|Junín|6591
120903|Chongos Bajo|Chupaca|Junín|4867
120904|Huáchac|Chupaca|Junín|2783
120905|Huamancaca Chico|Chupaca|Junín|13263
120906|San Juan de Iscos|Chupaca|Junín|2280
120907|San Juan de Jarpa|Chupaca|Junín|2236
120908|Tres de Diciembre|Chupaca|Junín|3613
120909|Yanacancha|Chupaca|Junín|2321
130101|Trujillo|Trujillo|La Libertad|359982
130102|El Porvenir|Trujillo|La Libertad|134258
130103|Florencia de Mora|Trujillo|La Libertad|65310
130104|Huanchaco|Trujillo|La Libertad|103075
130105|La Esperanza|Trujillo|La Libertad|249310
130106|Laredo|Trujillo|La Libertad|56718
130107|Moche|Trujillo|La Libertad|47246
130108|Poroto|Trujillo|La Libertad|4032
130109|Salaverry|Trujillo|La Libertad|25844
130110|Simbal|Trujillo|La Libertad|4658
130111|Victor Larco Herrera|Trujillo|La Libertad|85912
130112|Alto Trujillo|Trujillo|La Libertad|87632
130201|Ascope|Ascope|La Libertad|6848
130202|Chicama|Ascope|La Libertad|16245
130203|Chocope|Ascope|La Libertad|9743
130204|Magdalena de Cao|Ascope|La Libertad|2609
130205|Paiján|Ascope|La Libertad|30960
130206|Rázuri|Ascope|La Libertad|9745
130207|Santiago de Cao|Ascope|La Libertad|20204
130208|Casa Grande|Ascope|La Libertad|29984
130301|Bolívar|Bolívar|La Libertad|5133
130302|Bambamarca|Bolívar|La Libertad|3016
130303|Condormarca|Bolívar|La Libertad|2110
130304|Longotea|Bolívar|La Libertad|2372
130305|Uchumarca|Bolívar|La Libertad|2220
130306|Ucuncha|Bolívar|La Libertad|887
130401|Chepén|Chepén|La Libertad|50115
130402|Pacanga|Chepén|La Libertad|26986
130403|Pueblo Nuevo|Chepén|La Libertad|12954
130501|Julcán|Julcán|La Libertad|12821
130502|Calamarca|Julcán|La Libertad|4625
130503|Carabamba|Julcán|La Libertad|6935
130504|Huaso|Julcán|La Libertad|6255
130601|Otuzco|Otuzco|La Libertad|27630
130602|Agallpampa|Otuzco|La Libertad|10721
130604|Charat|Otuzco|La Libertad|2409
130605|Huaranchal|Otuzco|La Libertad|3820
130606|La Cuesta|Otuzco|La Libertad|651
130608|Mache|Otuzco|La Libertad|2770
130610|Paranday|Otuzco|La Libertad|509
130611|Salpo|Otuzco|La Libertad|6631
130613|Sinsicap|Otuzco|La Libertad|7322
130614|Usquil|Otuzco|La Libertad|21956
130701|San Pedro de Lloc|Pacasmayo|La Libertad|20469
130702|Guadalupe|Pacasmayo|La Libertad|46402
130703|Jequetepeque|Pacasmayo|La Libertad|5064
130704|Pacasmayo|Pacasmayo|La Libertad|34340
130705|San José|Pacasmayo|La Libertad|13047
130801|Tayabamba|Pataz|La Libertad|13825
130802|Buldibuyo|Pataz|La Libertad|4356
130803|Chillia|Pataz|La Libertad|13370
130804|Huancaspata|Pataz|La Libertad|6101
130805|Huaylillas|Pataz|La Libertad|950
130806|Huayo|Pataz|La Libertad|3670
130807|Ongon|Pataz|La Libertad|1279
130808|Parcoy|Pataz|La Libertad|22645
130809|Pataz|Pataz|La Libertad|11895
130810|Pias|Pataz|La Libertad|2023
130811|Santiago de Challas|Pataz|La Libertad|2166
130812|Taurija|Pataz|La Libertad|3026
130813|Urpay|Pataz|La Libertad|2283
130901|Huamachuco|Sánchez Carrión|La Libertad|89656
130902|Chugay|Sánchez Carrión|La Libertad|19982
130903|Cochorco|Sánchez Carrión|La Libertad|10452
130904|Curgos|Sánchez Carrión|La Libertad|8981
130905|Marcabal|Sánchez Carrión|La Libertad|10166
130906|Sanagoran|Sánchez Carrión|La Libertad|15459
130907|Sarín|Sánchez Carrión|La Libertad|10130
130908|Sartimbamba|Sánchez Carrión|La Libertad|14888
131001|Santiago de Chuco|Santiago de Chuco|La Libertad|20652
131002|Angasmarca|Santiago de Chuco|La Libertad|4669
131003|Cachicadan|Santiago de Chuco|La Libertad|5507
131004|Mollebamba|Santiago de Chuco|La Libertad|1813
131005|Mollepata|Santiago de Chuco|La Libertad|2341
131006|Quiruvilca|Santiago de Chuco|La Libertad|13627
131007|Santa Cruz de Chuca|Santiago de Chuco|La Libertad|2994
131008|Sitabamba|Santiago de Chuco|La Libertad|3663
131101|Cascas|Gran Chimú|La Libertad|14462
131102|Lucma|Gran Chimú|La Libertad|4651
131103|Marmot|Gran Chimú|La Libertad|2619
131104|Sayapullo|Gran Chimú|La Libertad|6163
131201|Virú|Virú|La Libertad|61934
131202|Chao|Virú|La Libertad|44915
131203|Guadalupito|Virú|La Libertad|8145
140101|Chiclayo|Chiclayo|Lambayeque|298094
140102|Chongoyape|Chiclayo|Lambayeque|20252
140103|Etén|Chiclayo|Lambayeque|14054
140104|Etén Puerto|Chiclayo|Lambayeque|2489
140105|José Leonardo Ortiz|Chiclayo|Lambayeque|168913
140106|La Victoria|Chiclayo|Lambayeque|102844
140107|Lagunas|Chiclayo|Lambayeque|11323
140108|Monsefú|Chiclayo|Lambayeque|37104
140109|Nueva Arica|Chiclayo|Lambayeque|2576
140110|Oyotun|Chiclayo|Lambayeque|8154
140111|Picsi|Chiclayo|Lambayeque|15474
140112|Pimentel|Chiclayo|Lambayeque|54654
140113|Reque|Chiclayo|Lambayeque|19038
140114|Santa Rosa|Chiclayo|Lambayeque|15006
140115|Saña|Chiclayo|Lambayeque|12841
140116|Cayaltí|Chiclayo|Lambayeque|14659
140117|Patapo|Chiclayo|Lambayeque|26510
140118|Pomalca|Chiclayo|Lambayeque|28364
140119|Pucala|Chiclayo|Lambayeque|9087
140120|Tumán|Chiclayo|Lambayeque|30514
140201|Ferreñafe|Ferreñafe|Lambayeque|39234
140202|Cañaris|Ferreñafe|Lambayeque|11735
140203|Incahuasi|Ferreñafe|Lambayeque|15355
140204|Manuel Antonio Mesones Muro|Ferreñafe|Lambayeque|4229
140205|Pitipo|Ferreñafe|Lambayeque|22394
140206|Pueblo Nuevo|Ferreñafe|Lambayeque|16272
140301|Lambayeque|Lambayeque|Lambayeque|88933
140302|Chochope|Lambayeque|Lambayeque|1757
140303|Illimo|Lambayeque|Lambayeque|9728
140304|Jayanca|Lambayeque|Lambayeque|21260
140305|Mochumi|Lambayeque|Lambayeque|21625
140306|Mórrope|Lambayeque|Lambayeque|60153
140307|Motupe|Lambayeque|Lambayeque|37788
140308|Olmos|Lambayeque|Lambayeque|59666
140309|Pacora|Lambayeque|Lambayeque|9915
140310|Salas|Lambayeque|Lambayeque|13963
140311|San José|Lambayeque|Lambayeque|20334
140312|Tucume|Lambayeque|Lambayeque|26010
150101|Lima|Lima|Lima|265503
150102|Ancón|Lima|Lima|104552
150103|Ate|Lima|Lima|743517
150104|Barranco|Lima|Lima|37214
150105|Breña|Lima|Lima|97746
150106|Carabayllo|Lima|Lima|458341
150107|Chaclacayo|Lima|Lima|46394
150108|Chorrillos|Lima|Lima|380313
150109|Cieneguilla|Lima|Lima|41816
150110|Comas|Lima|Lima|600307
150111|El Agustino|Lima|Lima|240130
150112|Independencia|Lima|Lima|235535
150113|Jesús María|Lima|Lima|86967
150114|La Molina|Lima|Lima|170998
150115|La Victoria|Lima|Lima|190612
150116|Lince|Lima|Lima|64730
150117|Los Olivos|Lima|Lima|368511
150118|Lurigancho|Lima|Lima|327438
150119|Lurín|Lima|Lima|120575
150120|Magdalena Del Mar|Lima|Lima|71558
150121|Pueblo Libre|Lima|Lima|102707
150122|Miraflores|Lima|Lima|120252
150123|Pachacámac|Lima|Lima|167211
150124|Pucusana|Lima|Lima|18906
150125|Puente Piedra|Lima|Lima|435888
150126|Punta Hermosa|Lima|Lima|25288
150127|Punta Negra|Lima|Lima|9625
150128|Rímac|Lima|Lima|186404
150129|San Bartolo|Lima|Lima|10071
150130|San Borja|Lima|Lima|135613
150131|San Isidro|Lima|Lima|71527
150132|San Juan de Lurigancho|Lima|Lima|1282635
150133|San Juan de Miraflores|Lima|Lima|433709
150134|San Luis|Lima|Lima|56875
150135|San Martin de Porres|Lima|Lima|802774
150136|San Miguel|Lima|Lima|189947
150137|Santa Anita|Lima|Lima|233865
150138|Santa María del Mar|Lima|Lima|1314
150139|Santa Rosa|Lima|Lima|48300
150140|Santiago de Surco|Lima|Lima|437028
150141|Surquillo|Lima|Lima|105004
150142|Villa El Salvador|Lima|Lima|442292
150143|Villa María Del Triunfo|Lima|Lima|462141
150201|Barranca|Barranca|Lima|78605
150202|Paramonga|Barranca|Lima|21310
150203|Pativilca|Barranca|Lima|18614
150204|Supe|Barranca|Lima|28685
150205|Supe Puerto|Barranca|Lima|14488
150301|Cajatambo|Cajatambo|Lima|1816
150302|Copa|Cajatambo|Lima|801
150303|Gorgor|Cajatambo|Lima|1484
150304|Huancapón|Cajatambo|Lima|872
150305|Manas|Cajatambo|Lima|934
150401|Canta|Canta|Lima|2186
150402|Arahuay|Canta|Lima|549
150403|Huamantanga|Canta|Lima|596
150404|Huaros|Canta|Lima|731
150405|Lachaqui|Canta|Lima|835
150406|San Buenaventura|Canta|Lima|619
150407|Santa Rosa de Quives|Canta|Lima|5728
150501|San Vicente de Cañete|Cañete|Lima|67627
150502|Asia|Cañete|Lima|11909
150503|Calango|Cañete|Lima|2473
150504|Cerro Azul|Cañete|Lima|10654
150505|Chilca|Cañete|Lima|28336
150506|Coayllo|Cañete|Lima|1151
150507|Imperial|Cañete|Lima|40656
150508|Lunahuana|Cañete|Lima|3921
150509|Mala|Cañete|Lima|36780
150510|Nuevo Imperial|Cañete|Lima|32838
150511|Pacarán|Cañete|Lima|1767
150512|Quilmana|Cañete|Lima|17285
150513|San Antonio|Cañete|Lima|5049
150514|San Luis|Cañete|Lima|13616
150515|Santa Cruz de Flores|Cañete|Lima|3465
150516|Zuñiga|Cañete|Lima|1265
150601|Huaral|Huaral|Lima|114661
150602|Atavillos Alto|Huaral|Lima|622
150603|Atavillos Bajo|Huaral|Lima|756
150604|Aucallama|Huaral|Lima|23943
150605|Chancay|Huaral|Lima|65886
150606|Ihuari|Huaral|Lima|1858
150607|Lampián|Huaral|Lima|277
150608|Pacaraos|Huaral|Lima|1451
150609|San Miguel de Acos|Huaral|Lima|610
150610|Santa Cruz de Andamarca|Huaral|Lima|696
150611|Sumbilca|Huaral|Lima|641
150612|Veintisiete de Noviembre|Huaral|Lima|348
150701|Matucana|Huarochirí|Lima|3856
150702|Antioquía|Huarochirí|Lima|1123
150703|Callahuanca|Huarochirí|Lima|583
150704|Carampoma|Huarochirí|Lima|291
150705|Chicla|Huarochirí|Lima|2609
150706|Cuenca|Huarochirí|Lima|476
150707|Huachupampa|Huarochirí|Lima|470
150708|Huanza|Huarochirí|Lima|674
150709|Huarochirí|Huarochirí|Lima|1107
150710|Lahuaytambo|Huarochirí|Lima|513
150711|Langa|Huarochirí|Lima|752
150712|San Pedro de Laraos|Huarochirí|Lima|498
150713|Mariatana|Huarochirí|Lima|1352
150714|Ricardo Palma|Huarochirí|Lima|6792
150715|San Andrés de Tupicocha|Huarochirí|Lima|1174
150716|San Antonio|Huarochirí|Lima|6141
150717|San Bartolomé|Huarochirí|Lima|986
150718|San Damian|Huarochirí|Lima|1026
150719|San Juan de Iris|Huarochirí|Lima|606
150720|San Juan de Tantaranche|Huarochirí|Lima|314
150721|San Lorenzo de Quinti|Huarochirí|Lima|1047
150722|San Mateo|Huarochirí|Lima|3687
150723|San Mateo de Otao|Huarochirí|Lima|1200
150724|San Pedro de Casta|Huarochirí|Lima|792
150725|San Pedro de Huancayre|Huarochirí|Lima|176
150726|Sangallaya|Huarochirí|Lima|598
150727|Santa Cruz de Cocachacra|Huarochirí|Lima|2651
150728|Santa Eulalia|Huarochirí|Lima|13755
150729|Santiago de Anchucaya|Huarochirí|Lima|243
150730|Santiago de Tuna|Huarochirí|Lima|317
150731|Santo Domingo de Los Olleros|Huarochirí|Lima|3406
150732|Surco|Huarochirí|Lima|1240
150801|Huacho|Huaura|Lima|78039
150802|Ambar|Huaura|Lima|1902
150803|Caleta de Carquín|Huaura|Lima|10206
150804|Checras|Huaura|Lima|805
150805|Hualmay|Huaura|Lima|30341
150806|Huaura|Huaura|Lima|40220
150807|Leoncio Prado|Huaura|Lima|2007
150808|Paccho|Huaura|Lima|1401
150809|Santa Leonor|Huaura|Lima|829
150810|Santa María|Huaura|Lima|42130
150811|Sayán|Huaura|Lima|26547
150812|Vegueta|Huaura|Lima|31159
150901|Oyón|Oyón|Lima|11799
150902|Andajes|Oyón|Lima|399
150903|Caujul|Oyón|Lima|434
150904|Cochamarca|Oyón|Lima|916
150905|Naván|Oyón|Lima|767
150906|Pachangara|Oyón|Lima|2137
151001|Yauyos|Yauyos|Lima|1090
151002|Alis|Yauyos|Lima|1468
151003|Allauca|Yauyos|Lima|903
151004|Ayaviri|Yauyos|Lima|454
151005|Azángaro|Yauyos|Lima|359
151006|Cacra|Yauyos|Lima|516
151007|Carania|Yauyos|Lima|128
151008|Catahuasi|Yauyos|Lima|1055
151009|Chocos|Yauyos|Lima|686
151010|Cochas|Yauyos|Lima|191
151011|Colonia|Yauyos|Lima|990
151012|Hongos|Yauyos|Lima|288
151013|Huampara|Yauyos|Lima|109
151014|Huancaya|Yauyos|Lima|411
151015|Huangascar|Yauyos|Lima|635
151016|Huantan|Yauyos|Lima|959
151017|Huañec|Yauyos|Lima|438
151018|Laraos|Yauyos|Lima|426
151019|Lincha|Yauyos|Lima|330
151020|Madean|Yauyos|Lima|460
151021|Miraflores|Yauyos|Lima|162
151022|Omas|Yauyos|Lima|611
151023|Putinza|Yauyos|Lima|546
151024|Quinches|Yauyos|Lima|443
151025|Quinocay|Yauyos|Lima|360
151026|San Joaquín|Yauyos|Lima|131
151027|San Pedro de Pilas|Yauyos|Lima|228
151028|Tanta|Yauyos|Lima|511
151029|Tauripampa|Yauyos|Lima|468
151030|Tomás|Yauyos|Lima|375
151031|Tupe|Yauyos|Lima|445
151032|Viñac|Yauyos|Lima|1584
151033|Vitis|Yauyos|Lima|215
160101|Iquitos|Maynas|Loreto|165248
160102|Alto Nanay|Maynas|Loreto|3486
160103|Fernando Lores|Maynas|Loreto|12507
160104|Indiana|Maynas|Loreto|11343
160105|Las Amazonas|Maynas|Loreto|7752
160106|Mazan|Maynas|Loreto|14275
160107|Napo|Maynas|Loreto|18416
160108|Punchana|Maynas|Loreto|92404
160110|Torres Causana|Maynas|Loreto|5078
160112|Belén|Maynas|Loreto|71401
160113|San Juan Bautista|Maynas|Loreto|167766
160201|Yurimaguas|Alto Amazonas|Loreto|115218
160202|Balsapuerto|Alto Amazonas|Loreto|17826
160205|Jeberos|Alto Amazonas|Loreto|4782
160206|Lagunas|Alto Amazonas|Loreto|13811
160210|Santa Cruz|Alto Amazonas|Loreto|4327
160211|Teniente César López Rojas|Alto Amazonas|Loreto|6312
160301|Nauta|Loreto|Loreto|34827
160302|Parinari|Loreto|Loreto|5756
160303|Tigre|Loreto|Loreto|7686
160304|Trompeteros|Loreto|Loreto|11703
160305|Urarinas|Loreto|Loreto|14377
160401|Ramón Castilla|Mariscal Ramón Castilla|Loreto|25631
160402|Pebas|Mariscal Ramón Castilla|Loreto|12138
160403|Yavari|Mariscal Ramón Castilla|Loreto|9808
160404|San Pablo|Mariscal Ramón Castilla|Loreto|12829
160501|Requena|Requena|Loreto|28300
160502|Alto Tapiche|Requena|Loreto|1493
160503|Capelo|Requena|Loreto|1950
160504|Emilio San Martín|Requena|Loreto|6714
160505|Maquia|Requena|Loreto|8825
160506|Puinahua|Requena|Loreto|4293
160507|Saquena|Requena|Loreto|2800
160508|Soplin|Requena|Loreto|719
160509|Tapiche|Requena|Loreto|903
160510|Jenaro Herrera|Requena|Loreto|4992
160511|Yaquerana|Requena|Loreto|2173
160601|Contamana|Ucayali|Loreto|29867
160602|Inahuaya|Ucayali|Loreto|1624
160603|Padre Márquez|Ucayali|Loreto|2858
160604|Pampa Hermosa|Ucayali|Loreto|5860
160605|Sarayacu|Ucayali|Loreto|15360
160606|Vargas Guerra|Ucayali|Loreto|7377
160701|Barranca|Datem del Marañón|Loreto|16939
160702|Cahuapanas|Datem del Marañón|Loreto|8168
160703|Manseriche|Datem del Marañón|Loreto|9561
160704|Morona|Datem del Marañón|Loreto|4042
160705|Pastaza|Datem del Marañón|Loreto|6058
160706|Andoas|Datem del Marañón|Loreto|17102
160801|Putumayo|Putumayo|Loreto|4513
160802|Rosa Panduro|Putumayo|Loreto|586
160803|Teniente Manuel Clavero|Putumayo|Loreto|2057
160804|Yaguas|Putumayo|Loreto|1654
170101|Tambopata|Tambopata|Madre de Dios|116785
170102|Inambari|Tambopata|Madre de Dios|18646
170103|Las Piedras|Tambopata|Madre de Dios|26294
170104|Laberinto|Tambopata|Madre de Dios|7020
170201|Manu|Manu|Madre de Dios|2242
170202|Fitzcarrald|Manu|Madre de Dios|1613
170203|Madre de Dios|Manu|Madre de Dios|6141
170204|Huepetuhe|Manu|Madre de Dios|11281
170301|Iñapari|Tahuamanu|Madre de Dios|3632
170302|Iberia|Tahuamanu|Madre de Dios|5554
170303|Tahuamanu|Tahuamanu|Madre de Dios|3861
180101|Moquegua|Mariscal Nieto|Moquegua|49643
180102|Carumas|Mariscal Nieto|Moquegua|2065
180103|Cuchumbaya|Mariscal Nieto|Moquegua|648
180104|Samegua|Mariscal Nieto|Moquegua|10503
180105|San Cristóbal|Mariscal Nieto|Moquegua|1349
180106|Torata|Mariscal Nieto|Moquegua|6658
180107|San Antonio|Mariscal Nieto|Moquegua|30152
180201|Omate|General Sánchez Cerro|Moquegua|2861
180202|Chojata|General Sánchez Cerro|Moquegua|438
180203|Coalaque|General Sánchez Cerro|Moquegua|873
180204|Ichuña|General Sánchez Cerro|Moquegua|2732
180205|La Capilla|General Sánchez Cerro|Moquegua|374
180206|Lloque|General Sánchez Cerro|Moquegua|352
180207|Matalaque|General Sánchez Cerro|Moquegua|295
180208|Puquina|General Sánchez Cerro|Moquegua|2339
180209|Quinistaquillas|General Sánchez Cerro|Moquegua|365
180210|Ubinas|General Sánchez Cerro|Moquegua|1186
180211|Yunga|General Sánchez Cerro|Moquegua|657
180301|Ilo|Ilo|Moquegua|72975
180302|El Algarrobal|Ilo|Moquegua|12014
180303|Pacocha|Ilo|Moquegua|4467
190101|Chaupimarca|Pasco|Pasco|25420
190102|Huachón|Pasco|Pasco|4471
190103|Huariaca|Pasco|Pasco|6360
190104|Huayllay|Pasco|Pasco|8762
190105|Ninacaca|Pasco|Pasco|4157
190106|Pallanchacra|Pasco|Pasco|1048
190107|Paucartambo|Pasco|Pasco|6536
190108|San Francisco de Asís de Yarusyacán|Pasco|Pasco|2503
190109|Simón Bolívar|Pasco|Pasco|11977
190110|Ticlacayan|Pasco|Pasco|1778
190111|Tinyahuarco|Pasco|Pasco|7582
190112|Vicco|Pasco|Pasco|4156
190113|Yanacancha|Pasco|Pasco|30833
190201|Yanahuanca|Daniel Alcides Carrión|Pasco|9922
190202|Chacayan|Daniel Alcides Carrión|Pasco|1285
190203|Goyllarisquizga|Daniel Alcides Carrión|Pasco|1109
190204|Paucar|Daniel Alcides Carrión|Pasco|1532
190205|San Pedro de Pillao|Daniel Alcides Carrión|Pasco|1195
190206|Santa Ana de Tusi|Daniel Alcides Carrión|Pasco|25017
190207|Tapuc|Daniel Alcides Carrión|Pasco|1633
190208|Vilcabamba|Daniel Alcides Carrión|Pasco|2114
190301|Oxapampa|Oxapampa|Pasco|18061
190302|Chontabamba|Oxapampa|Pasco|7111
190303|Huancabamba|Oxapampa|Pasco|7240
190304|Palcazu|Oxapampa|Pasco|7650
190305|Pozuzo|Oxapampa|Pasco|3600
190306|Puerto Bermúdez|Oxapampa|Pasco|23240
190307|Villa Rica|Oxapampa|Pasco|18278
190308|Constitución|Oxapampa|Pasco|18784
200101|Piura|Piura|Piura|194198
200104|Castilla|Piura|Piura|205967
200105|Catacaos|Piura|Piura|84928
200107|Cura Mori|Piura|Piura|20806
200108|El Tallán|Piura|Piura|5670
200109|La Arena|Piura|Piura|42909
200110|La Unión|Piura|Piura|46764
200111|Las Lomas|Piura|Piura|29538
200114|Tambo Grande|Piura|Piura|132980
200115|Veintiséis de Octubre|Piura|Piura|210015
200201|Ayabaca|Ayabaca|Piura|31040
200202|Frías|Ayabaca|Piura|20914
200203|Jilili|Ayabaca|Piura|2591
200204|Lagunas|Ayabaca|Piura|5567
200205|Montero|Ayabaca|Piura|6416
200206|Pacaipampa|Ayabaca|Piura|22870
200207|Paimas|Ayabaca|Piura|10768
200208|Sapillica|Ayabaca|Piura|10957
200209|Sicchez|Ayabaca|Piura|1455
200210|Suyo|Ayabaca|Piura|12125
200301|Huancabamba|Huancabamba|Piura|29268
200302|Canchaque|Huancabamba|Piura|7175
200303|El Carmen de La Frontera|Huancabamba|Piura|11500
200304|Huarmaca|Huancabamba|Piura|36849
200305|Lalaquiz|Huancabamba|Piura|3873
200306|San Miguel de El Faique|Huancabamba|Piura|9543
200307|Sondor|Huancabamba|Piura|7091
200308|Sondorillo|Huancabamba|Piura|11471
200401|Chulucanas|Morropón|Piura|93041
200402|Buenos Aires|Morropón|Piura|10747
200403|Chalaco|Morropón|Piura|7048
200404|La Matanza|Morropón|Piura|15843
200405|Morropón|Morropón|Piura|16724
200406|Salitral|Morropón|Piura|9321
200407|San Juan de Bigote|Morropón|Piura|6619
200408|Santa Catalina de Mossa|Morropón|Piura|3633
200409|Santo Domingo|Morropón|Piura|5309
200410|Yamango|Morropón|Piura|8300
200501|Paita|Paita|Piura|113706
200502|Amotape|Paita|Piura|2611
200503|Arenal|Paita|Piura|1287
200504|Colan|Paita|Piura|17972
200505|La Huaca|Paita|Piura|14980
200506|Tamarindo|Paita|Piura|5666
200507|Vichayal|Paita|Piura|6566
200601|Sullana|Sullana|Piura|198198
200602|Bellavista|Sullana|Piura|39761
200603|Ignacio Escudero|Sullana|Piura|22714
200604|Lancones|Sullana|Piura|13395
200605|Marcavelica|Sullana|Piura|33956
200606|Miguel Checa|Sullana|Piura|10965
200607|Querecotillo|Sullana|Piura|29150
200608|Salitral|Sullana|Piura|8093
200701|Pariñas|Talara|Piura|109593
200702|El Alto|Talara|Piura|9467
200703|La Brea|Talara|Piura|13420
200704|Lobitos|Talara|Piura|1367
200705|Los Órganos|Talara|Piura|12186
200706|Máncora|Talara|Piura|15088
200801|Sechura|Sechura|Piura|58157
200802|Bellavista de La Unión|Sechura|Piura|5702
200803|Bernal|Sechura|Piura|8325
200804|Cristo Nos Valga|Sechura|Piura|5577
200805|Vice|Sechura|Piura|19717
200806|Rinconada Llicuar|Sechura|Piura|3258
210101|Puno|Puno|Puno|140967
210102|Acora|Puno|Puno|19579
210103|Amantani|Puno|Puno|2851
210104|Atuncolla|Puno|Puno|4100
210105|Capachica|Puno|Puno|5398
210106|Chucuito|Puno|Puno|6506
210107|Coata|Puno|Puno|6083
210108|Huata|Puno|Puno|2008
210109|Mañazo|Puno|Puno|4805
210110|Paucarcolla|Puno|Puno|3792
210111|Pichacani|Puno|Puno|5954
210112|Platería|Puno|Puno|6350
210113|San Antonio|Puno|Puno|2491
210114|Tiquillaca|Puno|Puno|1336
210115|Vilque|Puno|Puno|2667
210201|Azángaro|Azángaro|Puno|32909
210202|Achaya|Azángaro|Puno|2434
210203|Arapa|Azángaro|Puno|6702
210204|Asillo|Azángaro|Puno|13486
210205|Caminaca|Azángaro|Puno|2730
210206|Chupa|Azángaro|Puno|3948
210207|José Domingo Choquehuanca|Azángaro|Puno|4641
210208|Muñani|Azángaro|Puno|6647
210209|Potoni|Azángaro|Puno|2773
210210|Saman|Azángaro|Puno|7381
210211|San Antón|Azángaro|Puno|6791
210212|San José|Azángaro|Puno|4590
210213|San Juan de Salinas|Azángaro|Puno|2531
210214|Santiago de Pupuja|Azángaro|Puno|4111
210215|Tirapata|Azángaro|Puno|2924
210301|Macusani|Carabaya|Puno|15035
210302|Ajoyani|Carabaya|Puno|2668
210303|Ayapata|Carabaya|Puno|9559
210304|Coasa|Carabaya|Puno|4387
210305|Corani|Carabaya|Puno|5125
210306|Crucero|Carabaya|Puno|10655
210307|Ituata|Carabaya|Puno|9451
210308|Ollachea|Carabaya|Puno|7112
210309|San Gabán|Carabaya|Puno|9552
210310|Usicayos|Carabaya|Puno|7060
210401|Juli|Chucuito|Puno|19931
210402|Desaguadero|Chucuito|Puno|11554
210403|Huacullani|Chucuito|Puno|7223
210404|Kelluyo|Chucuito|Puno|4458
210405|Pisacoma|Chucuito|Puno|7190
210406|Pomata|Chucuito|Puno|13228
210407|Zepita|Chucuito|Puno|17133
210501|Ilave|El Collao|Puno|46289
210502|Capazo|El Collao|Puno|909
210503|Pilcuyo|El Collao|Puno|9679
210504|Santa Rosa|El Collao|Puno|2432
210505|Conduriri|El Collao|Puno|1920
210601|Huancané|Huancané|Puno|18129
210602|Cojata|Huancané|Puno|3845
210603|Huatasani|Huancané|Puno|2785
210604|Inchupalla|Huancané|Puno|2266
210605|Pusi|Huancané|Puno|4583
210606|Rosaspata|Huancané|Puno|3507
210607|Taraco|Huancané|Puno|12998
210608|Vilque Chico|Huancané|Puno|6754
210701|Lampa|Lampa|Puno|11560
210702|Cabanilla|Lampa|Puno|6023
210703|Calapuja|Lampa|Puno|1858
210704|Nicasio|Lampa|Puno|2123
210705|Ocuviri|Lampa|Puno|2112
210706|Palca|Lampa|Puno|1276
210707|Paratia|Lampa|Puno|1752
210708|Pucará|Lampa|Puno|4855
210709|Santa Lucía|Lampa|Puno|6997
210710|Vilavila|Lampa|Puno|844
210801|Ayaviri|Melgar|Puno|26562
210802|Antauta|Melgar|Puno|5974
210803|Cupi|Melgar|Puno|1780
210804|Llalli|Melgar|Puno|2019
210805|Macari|Melgar|Puno|6780
210806|Nuñoa|Melgar|Puno|7192
210807|Orurillo|Melgar|Puno|6431
210808|Santa Rosa|Melgar|Puno|5972
210809|Umachiri|Melgar|Puno|3727
210901|Moho|Moho|Puno|9538
210902|Conima|Moho|Puno|3208
210903|Huayrapata|Moho|Puno|2118
210904|Tilali|Moho|Puno|2409
211001|Putina|San Antonio de Putina|Puno|12133
211002|Ananea|San Antonio de Putina|Puno|9432
211003|Pedro Vilca Apaza|San Antonio de Putina|Puno|1751
211004|Quilcapuncu|San Antonio de Putina|Puno|5626
211005|Sina|San Antonio de Putina|Puno|1957
211101|Juliaca|San Román|Puno|264040
211102|Cabana|San Román|Puno|5668
211103|Cabanillas|San Román|Puno|3877
211104|Caracoto|San Román|Puno|7702
211105|San Miguel|San Román|Puno|79521
211201|Sandia|Sandia|Puno|11013
211202|Cuyocuyo|Sandia|Puno|5566
211203|Limbani|Sandia|Puno|2872
211204|Patambuco|Sandia|Puno|4005
211205|Phara|Sandia|Puno|6485
211206|Quiaca|Sandia|Puno|2259
211207|San Juan del Oro|Sandia|Puno|2173
211208|Yanahuaya|Sandia|Puno|1902
211209|Alto Inambari|Sandia|Puno|7138
211210|San Pedro de Putina Punco|Sandia|Puno|9608
211301|Yunguyo|Yunguyo|Puno|23823
211302|Anapia|Yunguyo|Puno|1596
211303|Copani|Yunguyo|Puno|4834
211304|Cuturapi|Yunguyo|Puno|1283
211305|Ollaraya|Yunguyo|Puno|2082
211306|Tinicachi|Yunguyo|Puno|725
211307|Unicachi|Yunguyo|Puno|553
220101|Moyobamba|Moyobamba|San Martín|91526
220102|Calzada|Moyobamba|San Martín|4964
220103|Habana|Moyobamba|San Martín|1635
220104|Jepelacio|Moyobamba|San Martín|14811
220105|Soritor|Moyobamba|San Martín|22515
220106|Yantalo|Moyobamba|San Martín|2961
220201|Bellavista|Bellavista|San Martín|20018
220202|Alto Biavo|Bellavista|San Martín|10818
220203|Bajo Biavo|Bellavista|San Martín|16068
220204|Huallaga|Bellavista|San Martín|2728
220205|San Pablo|Bellavista|San Martín|8595
220206|San Rafael|Bellavista|San Martín|6457
220301|San José de Sisa|El Dorado|San Martín|18239
220302|Agua Blanca|El Dorado|San Martín|2322
220303|San Martín|El Dorado|San Martín|14349
220304|Santa Rosa|El Dorado|San Martín|7756
220305|Shatoja|El Dorado|San Martín|3426
220401|Saposoa|Huallaga|San Martín|15747
220402|Alto Saposoa|Huallaga|San Martín|6359
220403|El Eslabón|Huallaga|San Martín|1690
220404|Piscoyacu|Huallaga|San Martín|5112
220405|Sacanche|Huallaga|San Martín|2173
220406|Tingo de Saposoa|Huallaga|San Martín|846
220501|Lamas|Lamas|San Martín|16081
220502|Alonso de Alvarado|Lamas|San Martín|14179
220503|Barranquita|Lamas|San Martín|8280
220504|Caynarachi|Lamas|San Martín|11828
220505|Cuñumbuqui|Lamas|San Martín|2584
220506|Pinto Recodo|Lamas|San Martín|8887
220507|Rumisapa|Lamas|San Martín|4132
220508|San Roque de Cumbaza|Lamas|San Martín|1774
220509|Shanao|Lamas|San Martín|1632
220510|Tabalosos|Lamas|San Martín|15127
220511|Zapatero|Lamas|San Martín|6086
220601|Juanjuí|Mariscal Cáceres|San Martín|36637
220602|Campanilla|Mariscal Cáceres|San Martín|21348
220603|Huicungo|Mariscal Cáceres|San Martín|10724
220604|Pachiza|Mariscal Cáceres|San Martín|7741
220605|Pajarillo|Mariscal Cáceres|San Martín|6087
220701|Picota|Picota|San Martín|12487
220702|Buenos Aires|Picota|San Martín|2993
220703|Caspisapa|Picota|San Martín|2254
220704|Pilluana|Picota|San Martín|867
220705|Pucacaca|Picota|San Martín|3062
220706|San Cristóbal|Picota|San Martín|1184
220707|San Hilarión|Picota|San Martín|3541
220708|Shamboyacu|Picota|San Martín|11481
220709|Tingo de Ponasa|Picota|San Martín|3797
220710|Tres Unidos|Picota|San Martín|4098
220801|Rioja|Rioja|San Martín|27752
220802|Awajun|Rioja|San Martín|8045
220803|Elias Soplín Vargas|Rioja|San Martín|25754
220804|Nueva Cajamarca|Rioja|San Martín|50086
220805|Pardo Miguel|Rioja|San Martín|16976
220806|Posic|Rioja|San Martín|2302
220807|San Fernando|Rioja|San Martín|3619
220808|Yorongos|Rioja|San Martín|2417
220809|Yuracyacu|Rioja|San Martín|3631
220901|Tarapoto|San Martín|San Martín|87244
220902|Alberto Leveau|San Martín|San Martín|944
220903|Cacatachi|San Martín|San Martín|4022
220904|Chazuta|San Martín|San Martín|11189
220905|Chipurana|San Martín|San Martín|2570
220906|El Porvenir|San Martín|San Martín|2697
220907|Huimbayoc|San Martín|San Martín|5902
220908|Juan Guerra|San Martín|San Martín|4428
220909|La Banda de Shilcayo|San Martín|San Martín|56142
220910|Morales|San Martín|San Martín|50071
220911|Papaplaya|San Martín|San Martín|1901
220912|San Antonio|San Martín|San Martín|1816
220913|Sauce|San Martín|San Martín|6017
220914|Shapaja|San Martín|San Martín|2138
221001|Tocache|Tocache|San Martín|31688
221002|Nuevo Progreso|Tocache|San Martín|13071
221003|Pólvora|Tocache|San Martín|11272
221004|Shunte|Tocache|San Martín|1464
221005|Uchiza|Tocache|San Martín|14503
221006|Santa Lucia|Tocache|San Martín|6122
230101|Tacna|Tacna|Tacna|108210
230102|Alto de La Alianza|Tacna|Tacna|33577
230103|Calana|Tacna|Tacna|3645
230104|Ciudad Nueva|Tacna|Tacna|30801
230105|Inclán|Tacna|Tacna|2185
230106|Pachia|Tacna|Tacna|2339
230107|Palca|Tacna|Tacna|2623
230108|Pocollay|Tacna|Tacna|19522
230109|Sama|Tacna|Tacna|4190
230110|Coronel Gregorio Albarracin Lanchipa|Tacna|Tacna|162215
230111|La Yarada los Palos|Tacna|Tacna|6953
230201|Candarave|Candarave|Tacna|2306
230202|Cairani|Candarave|Tacna|936
230203|Camilaca|Candarave|Tacna|1034
230204|Curibaya|Candarave|Tacna|661
230205|Huanuara|Candarave|Tacna|420
230206|Quilahuani|Candarave|Tacna|621
230301|Locumba|Jorge Basadre|Tacna|2918
230302|Ilabaya|Jorge Basadre|Tacna|7747
230303|Ite|Jorge Basadre|Tacna|3160
230401|Tarata|Tarata|Tacna|3556
230402|Héroes Albarracín|Tarata|Tacna|283
230403|Estique|Tarata|Tacna|207
230404|Estique-Pampa|Tarata|Tacna|311
230405|Sitajara|Tarata|Tacna|324
230406|Susapaya|Tarata|Tacna|473
230407|Tarucachi|Tarata|Tacna|296
230408|Ticaco|Tarata|Tacna|576
240101|Tumbes|Tumbes|Tumbes|121016
240102|Corrales|Tumbes|Tumbes|26518
240103|La Cruz|Tumbes|Tumbes|11376
240104|Pampas de Hospital|Tumbes|Tumbes|7792
240105|San Jacinto|Tumbes|Tumbes|9188
240106|San Juan de La Virgen|Tumbes|Tumbes|5177
240201|Zorritos|Contralmirante Villar|Tumbes|15127
240202|Casitas|Contralmirante Villar|Tumbes|2867
240203|Canoas de Punta Sal|Contralmirante Villar|Tumbes|9124
240301|Zarumilla|Zarumilla|Tumbes|28414
240302|Aguas Verdes|Zarumilla|Tumbes|20632
240303|Matapalo|Zarumilla|Tumbes|5231
240304|Papayal|Zarumilla|Tumbes|7672
250101|Calleria|Coronel Portillo|Ucayali|185692
250102|Campoverde|Coronel Portillo|Ucayali|21999
250103|Iparia|Coronel Portillo|Ucayali|12960
250104|Masisea|Coronel Portillo|Ucayali|12127
250105|Yarinacocha|Coronel Portillo|Ucayali|131600
250106|Nueva Requena|Coronel Portillo|Ucayali|5984
250107|Manantay|Coronel Portillo|Ucayali|121979
250201|Raimondi|Atalaya|Ucayali|44287
250202|Sepahua|Atalaya|Ucayali|8858
250203|Tahuania|Atalaya|Ucayali|11899
250204|Yurua|Atalaya|Ucayali|2745
250301|Padre Abad|Padre Abad|Ucayali|32586
250302|Irazola|Padre Abad|Ucayali|13832
250303|Curimaná|Padre Abad|Ucayali|12000
250304|Neshuya|Padre Abad|Ucayali|12301
250305|Alexander Von Humboldt|Padre Abad|Ucayali|6701
250306|Huipoca|Padre Abad|Ucayali|4894
250307|Boquerón|Padre Abad|Ucayali|5750
250401|Purús|Purús|Ucayali|3222`;
