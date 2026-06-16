# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: payment-smoke.spec.ts >> payment flow: login → table → add item → CASH payment → receipt → back to tables
- Location: e2e\payment-smoke.spec.ts:6:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Add' })
    - locator resolved to <button pc22="" pc25="" pc26="" disabled data-p="" pripple="" type="button" autofocus="true" data-pc-name="button" data-p-disabled="true" data-pc-section="root" class="p-ripple p-button p-component">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    110 × waiting for element to be visible, enabled and stable
        - element is not enabled
      - retrying click action
        - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic:
    - alertdialog
  - generic [ref=e4]:
    - banner [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]: SoftVinz Rest POS
        - generic [ref=e8]: TAKE AWAY
        - generic [ref=e9]: TW-MR 1
      - generic [ref=e10]:
        - generic [ref=e11]: 00:10:35
        - generic [ref=e12]: Wed, 17 Jun 2026
      - generic [ref=e13]:
        - generic [ref=e14]:
          - generic [ref=e15]: KUSAL
          - generic [ref=e16]: Unit 1
        - button [ref=e18] [cursor=pointer]
    - generic [ref=e19]:
      - generic [ref=e20]:
        - generic [ref=e21]:
          - button "NEW" [ref=e22] [cursor=pointer]
          - generic: CUSTOMER
          - generic [ref=e23]:
            - button "+" [disabled]
            - button "-" [disabled]
          - button "COMMENT" [disabled]
          - button "VOID" [disabled]
          - button "REMOVE SERVICE CHARGE" [ref=e24] [cursor=pointer]
          - button "CLEAR" [ref=e25] [cursor=pointer]
          - button "CHANGE TABLE" [ref=e26] [cursor=pointer]
          - button "SPLIT QTY" [disabled]
          - button "MOVE" [disabled]
          - button "MERGE" [ref=e27] [cursor=pointer]
          - button "TAG" [ref=e28] [cursor=pointer]
          - button "PACKS" [ref=e29] [cursor=pointer]
          - button "MOBILE NO" [ref=e30] [cursor=pointer]
          - button "MORE" [ref=e31] [cursor=pointer]
        - generic [ref=e32]:
          - textbox "PLU / barcode…" [ref=e34]
          - button "ENT" [ref=e35] [cursor=pointer]
        - generic [ref=e37]:
          - button "7" [ref=e38] [cursor=pointer]
          - button "8" [ref=e39] [cursor=pointer]
          - button "9" [ref=e40] [cursor=pointer]
          - button "4" [ref=e41] [cursor=pointer]
          - button "5" [ref=e42] [cursor=pointer]
          - button "6" [ref=e43] [cursor=pointer]
          - button "1" [ref=e44] [cursor=pointer]
          - button "2" [ref=e45] [cursor=pointer]
          - button "3" [ref=e46] [cursor=pointer]
          - button "." [ref=e47] [cursor=pointer]
          - button "0" [ref=e48] [cursor=pointer]
          - button [ref=e49] [cursor=pointer]
      - generic [ref=e50]:
        - generic [ref=e51]:
          - generic [ref=e52]: ORDER
          - generic [ref=e53]: R#5 | Z#1
          - generic [ref=e54]: 1 ITEMS
        - generic [ref=e56] [cursor=pointer]:
          - generic [ref=e58]: AMERICAN BREAKFAST
          - generic [ref=e59]:
            - generic [ref=e60]: 1 × 1,400.00
            - generic [ref=e61]: 1,400.00
        - generic [ref=e63]:
          - generic [ref=e64]: TOTAL
          - generic [ref=e65]: 1,400.00
        - generic [ref=e66]:
          - generic [ref=e67]:
            - generic: COPY
            - button "PAYMENT" [ref=e68] [cursor=pointer]: PAYMENT
          - generic: LAYAWAY
      - generic [ref=e71]:
        - generic [ref=e72]:
          - button "FOOD" [ref=e73] [cursor=pointer]
          - button "LOCAL LIQUOR" [ref=e74] [cursor=pointer]
          - button "FORIGN LIQUOR" [ref=e75] [cursor=pointer]
          - button "BEVERAGES" [ref=e76] [cursor=pointer]
          - button "TOBACO" [ref=e77] [cursor=pointer]
          - button "OTHER" [ref=e78] [cursor=pointer]
          - button "ROOM CHARGES" [ref=e79] [cursor=pointer]
          - button "BAR FOOD" [ref=e80] [cursor=pointer]
          - button "KOTTU" [ref=e81] [cursor=pointer]
          - button "SANDWICHES" [ref=e82] [cursor=pointer]
        - generic [ref=e83]:
          - generic [ref=e84]:
            - button "APPETIZERS" [ref=e85] [cursor=pointer]
            - button "RICE AND CURRY" [ref=e86] [cursor=pointer]
            - button "RICE" [ref=e87] [cursor=pointer]
            - button "NOODLES" [ref=e88] [cursor=pointer]
            - button "CHICKEN" [ref=e89] [cursor=pointer]
            - button "FISH" [ref=e90] [cursor=pointer]
            - button "PRAWNS" [ref=e91] [cursor=pointer]
            - button "CRAB" [ref=e92] [cursor=pointer]
            - button "SPECIAL DISHES" [ref=e93] [cursor=pointer]
            - button "CUTTLE FISH" [ref=e94] [cursor=pointer]
            - button "PORK" [ref=e95] [cursor=pointer]
            - button "MUTTON" [ref=e96] [cursor=pointer]
            - button "SAUSAGES" [ref=e97] [cursor=pointer]
            - button "OMLET" [ref=e98] [cursor=pointer]
            - button "VEGETABLES" [ref=e99] [cursor=pointer]
            - button "SALADS" [ref=e100] [cursor=pointer]
            - button "SET MENU" [ref=e101] [cursor=pointer]
            - button "DESSRTS" [ref=e102] [cursor=pointer]
            - button "OPEN FOOD/BEV" [ref=e103] [cursor=pointer]
            - button "SOUP" [ref=e104] [cursor=pointer]
            - button "SPEGHETTI/MECARONI" [ref=e105] [cursor=pointer]
            - button "LAMB" [ref=e106] [cursor=pointer]
            - button "BEEF" [ref=e107] [cursor=pointer]
          - generic [ref=e108]:
            - button "AMERICAN BREAKFAST" [ref=e109] [cursor=pointer]:
              - generic [ref=e110]: AMERICAN BREAKFAST
            - button "BANANA FITTER" [ref=e111] [cursor=pointer]:
              - generic [ref=e112]: BANANA FITTER
            - button "BATTED FISH" [ref=e113] [cursor=pointer]:
              - generic [ref=e114]: BATTED FISH
            - button "BATTER CUTTLELFISH" [ref=e115] [cursor=pointer]:
              - generic [ref=e116]: BATTER CUTTLELFISH
            - button "BATTER PRAWNS" [ref=e117] [cursor=pointer]:
              - generic [ref=e118]: BATTER PRAWNS
            - button "BATTERD MUSHROOMS" [ref=e119] [cursor=pointer]:
              - generic [ref=e120]: BATTERD MUSHROOMS
            - button "BECON RICE" [ref=e121] [cursor=pointer]:
              - generic [ref=e122]: BECON RICE
            - button "BEEF STEW" [ref=e123] [cursor=pointer]:
              - generic [ref=e124]: BEEF STEW
            - button "BEEF BECON" [ref=e125] [cursor=pointer]:
              - generic [ref=e126]: BEEF BECON
            - button "BEEF CURRY" [ref=e127] [cursor=pointer]:
              - generic [ref=e128]: BEEF CURRY
            - button "BEEF MECARONI" [ref=e129] [cursor=pointer]:
              - generic [ref=e130]: BEEF MECARONI
            - button "BEEF RICE" [ref=e131] [cursor=pointer]:
              - generic [ref=e132]: BEEF RICE
            - button "BEEFSTAK WITH CHIPS OR SALAD" [ref=e133] [cursor=pointer]:
              - generic [ref=e134]: BEEFSTAK WITH CHIPS OR SALAD
            - button "BLACK PAPPER BEEF" [ref=e135] [cursor=pointer]:
              - generic [ref=e136]: BLACK PAPPER BEEF
            - button "BLACK PEPPER CHICKEN" [ref=e137] [cursor=pointer]:
              - generic [ref=e138]: BLACK PEPPER CHICKEN
            - button "BLACK PEPPER MUTTON" [ref=e139] [cursor=pointer]:
              - generic [ref=e140]: BLACK PEPPER MUTTON
            - button "BLACK PEPPER PORK" [ref=e141] [cursor=pointer]:
              - generic [ref=e142]: BLACK PEPPER PORK
            - button "BOILED EGG" [ref=e143] [cursor=pointer]:
              - generic [ref=e144]: BOILED EGG
            - button "BOILED EGG 1" [ref=e145] [cursor=pointer]:
              - generic [ref=e146]: BOILED EGG 1
            - button "BOILED FISH" [ref=e147] [cursor=pointer]:
              - generic [ref=e148]: BOILED FISH
            - button "BOILED FISH WITH MASHED POTATO" [ref=e149] [cursor=pointer]:
              - generic [ref=e150]: BOILED FISH WITH MASHED POTATO
            - button "BOILED VEGITABLE" [ref=e151] [cursor=pointer]:
              - generic [ref=e152]: BOILED VEGITABLE
            - button "BOLANIS SPEGHETTI (BEEF)" [ref=e153] [cursor=pointer]:
              - generic [ref=e154]: BOLANIS SPEGHETTI (BEEF)
            - button "BROWN ONION SOUP" [ref=e155] [cursor=pointer]:
              - generic [ref=e156]: BROWN ONION SOUP
            - button "BUTTERD VEGITABLE" [ref=e157] [cursor=pointer]:
              - generic [ref=e158]: BUTTERD VEGITABLE
            - button "CALRBONARA SPEGHETTI" [ref=e159] [cursor=pointer]:
              - generic [ref=e160]: CALRBONARA SPEGHETTI
            - button "CARAMEL PUDDING" [ref=e161] [cursor=pointer]:
              - generic [ref=e162]: CARAMEL PUDDING
            - button "CARAMEL PUDDING (L)" [ref=e163] [cursor=pointer]:
              - generic [ref=e164]: CARAMEL PUDDING (L)
            - button "CASHEW NUTS" [ref=e165] [cursor=pointer]:
              - generic [ref=e166]: CASHEW NUTS
            - button "CHEESE CHICKEN MACARONI" [ref=e167] [cursor=pointer]:
              - generic [ref=e168]: CHEESE CHICKEN MACARONI
            - button "CHEESE CHICKEN MACARONI" [ref=e169] [cursor=pointer]:
              - generic [ref=e170]: CHEESE CHICKEN MACARONI
            - button "CHEESE CHICKEN OMLET" [ref=e171] [cursor=pointer]:
              - generic [ref=e172]: CHEESE CHICKEN OMLET
            - button "CHEESE MACARONI" [ref=e173] [cursor=pointer]:
              - generic [ref=e174]: CHEESE MACARONI
            - button "CHEESE OMLET" [ref=e175] [cursor=pointer]:
              - generic [ref=e176]: CHEESE OMLET
            - button "CHEESE SPEGHETTI" [ref=e177] [cursor=pointer]:
              - generic [ref=e178]: CHEESE SPEGHETTI
            - button "CHEF SALAD" [ref=e179] [cursor=pointer]:
              - generic [ref=e180]: CHEF SALAD
            - button "CHICKEN & CHEESE MACARONI" [ref=e181] [cursor=pointer]:
              - generic [ref=e182]: CHICKEN & CHEESE MACARONI
            - button "CHICKEN & CHEESE SPAGITY" [ref=e183] [cursor=pointer]:
              - generic [ref=e184]: CHICKEN & CHEESE SPAGITY
            - button "CHICKEN AND EGG SOUP" [ref=e185] [cursor=pointer]:
              - generic [ref=e186]: CHICKEN AND EGG SOUP
            - button "CHICKEN BECON" [ref=e187] [cursor=pointer]:
              - generic [ref=e188]: CHICKEN BECON
            - button "CHICKEN BIRIYANI" [ref=e189] [cursor=pointer]:
              - generic [ref=e190]: CHICKEN BIRIYANI
            - button "CHICKEN CHOPSUEY NOODLES" [ref=e191] [cursor=pointer]:
              - generic [ref=e192]: CHICKEN CHOPSUEY NOODLES
            - button "CHICKEN CHOPSUEY RICE" [ref=e193] [cursor=pointer]:
              - generic [ref=e194]: CHICKEN CHOPSUEY RICE
            - button "CHICKEN CHOPSUEY RICE" [ref=e195] [cursor=pointer]:
              - generic [ref=e196]: CHICKEN CHOPSUEY RICE
            - button "CHICKEN CURRY 1" [ref=e197] [cursor=pointer]:
              - generic [ref=e198]: CHICKEN CURRY 1
            - button "CHICKEN CURRY CUP" [ref=e199] [cursor=pointer]:
              - generic [ref=e200]: CHICKEN CURRY CUP
            - button "CHICKEN FRIED RICE" [ref=e201] [cursor=pointer]:
              - generic [ref=e202]: CHICKEN FRIED RICE
            - button "CHICKEN MACARONI" [ref=e203] [cursor=pointer]:
              - generic [ref=e204]: CHICKEN MACARONI
            - button "CHICKEN NOODLES" [ref=e205] [cursor=pointer]:
              - generic [ref=e206]: CHICKEN NOODLES
            - button "CHICKEN OMLET" [ref=e207] [cursor=pointer]:
              - generic [ref=e208]: CHICKEN OMLET
            - button "CHICKEN SOUP" [ref=e209] [cursor=pointer]:
              - generic [ref=e210]: CHICKEN SOUP
            - button "CHICKEN SPEGHETTI" [ref=e211] [cursor=pointer]:
              - generic [ref=e212]: CHICKEN SPEGHETTI
            - button "CHICKEN STEW" [ref=e213] [cursor=pointer]:
              - generic [ref=e214]: CHICKEN STEW
            - button "CHICKEN WITH CASHEW NUTS" [ref=e215] [cursor=pointer]:
              - generic [ref=e216]: CHICKEN WITH CASHEW NUTS
            - button "CHICKEN WITH SWEET CORN SOUP" [ref=e217] [cursor=pointer]:
              - generic [ref=e218]: CHICKEN WITH SWEET CORN SOUP
            - button "CHILLI BEEF" [ref=e219] [cursor=pointer]:
              - generic [ref=e220]: CHILLI BEEF
            - button "CHILLI CHICKEN" [ref=e221] [cursor=pointer]:
              - generic [ref=e222]: CHILLI CHICKEN
            - button "CHILLI CRAB" [ref=e223] [cursor=pointer]:
              - generic [ref=e224]: CHILLI CRAB
            - button "CHILLI FISH 1" [ref=e225] [cursor=pointer]:
              - generic [ref=e226]: CHILLI FISH 1
            - button "CHILLI FISH." [ref=e227] [cursor=pointer]:
              - generic [ref=e228]: CHILLI FISH.
            - button "CHILLI PORK" [ref=e229] [cursor=pointer]:
              - generic [ref=e230]: CHILLI PORK
            - button "CHINEASE STYLE MUTTON" [ref=e231] [cursor=pointer]:
              - generic [ref=e232]: CHINEASE STYLE MUTTON
            - button "CHINEASE STYLE PORK" [ref=e233] [cursor=pointer]:
              - generic [ref=e234]: CHINEASE STYLE PORK
            - button "CHINESE STYLE BEEF" [ref=e235] [cursor=pointer]:
              - generic [ref=e236]: CHINESE STYLE BEEF
            - button "CHIPS" [ref=e237] [cursor=pointer]:
              - generic [ref=e238]: CHIPS
            - button "CHIPS 1KG 1" [ref=e239] [cursor=pointer]:
              - generic [ref=e240]: CHIPS 1KG 1
            - button "CKICKEN 1 KG" [ref=e241] [cursor=pointer]:
              - generic [ref=e242]: CKICKEN 1 KG
            - button "COMBO RICE" [ref=e243] [cursor=pointer]:
              - generic [ref=e244]: COMBO RICE
            - button "CRAB CURRY" [ref=e245] [cursor=pointer]:
              - generic [ref=e246]: CRAB CURRY
            - button "CRABS (M) 100G" [ref=e247] [cursor=pointer]:
              - generic [ref=e248]: CRABS (M) 100G
            - button "CRISPY CHICKEN" [ref=e249] [cursor=pointer]:
              - generic [ref=e250]: CRISPY CHICKEN
            - button "CRISPY FISH" [ref=e251] [cursor=pointer]:
              - generic [ref=e252]: CRISPY FISH
            - button "CRISPY PRAWNS" [ref=e253] [cursor=pointer]:
              - generic [ref=e254]: CRISPY PRAWNS
            - button "CUCUMBER SALAD" [ref=e255] [cursor=pointer]:
              - generic [ref=e256]: CUCUMBER SALAD
            - button "CURD & TREACLE" [ref=e257] [cursor=pointer]:
              - generic [ref=e258]: CURD & TREACLE
            - button "CUTTLE FISH CURRY" [ref=e259] [cursor=pointer]:
              - generic [ref=e260]: CUTTLE FISH CURRY
            - button "CUTTLE FISH STEW" [ref=e261] [cursor=pointer]:
              - generic [ref=e262]: CUTTLE FISH STEW
            - button "DEVILED BEEF" [ref=e263] [cursor=pointer]:
              - generic [ref=e264]: DEVILED BEEF
            - button "DEVILED CHICKEN" [ref=e265] [cursor=pointer]:
              - generic [ref=e266]: DEVILED CHICKEN
            - button "DEVILED CRAB" [ref=e267] [cursor=pointer]:
              - generic [ref=e268]: DEVILED CRAB
            - button "DEVILED MUTTON" [ref=e269] [cursor=pointer]:
              - generic [ref=e270]: DEVILED MUTTON
            - button "DEVILED PORK" [ref=e271] [cursor=pointer]:
              - generic [ref=e272]: DEVILED PORK
            - button "DEVILED SAUSAGES" [ref=e273] [cursor=pointer]:
              - generic [ref=e274]: DEVILED SAUSAGES
            - button "DEVILLED CUTTLE FISH" [ref=e275] [cursor=pointer]:
              - generic [ref=e276]: DEVILLED CUTTLE FISH
            - button "DEVILLED FISH" [ref=e277] [cursor=pointer]:
              - generic [ref=e278]: DEVILLED FISH
            - button "DEVILLED LAMB" [ref=e279] [cursor=pointer]:
              - generic [ref=e280]: DEVILLED LAMB
            - button "DEVILLED MUSHROOMS" [ref=e281] [cursor=pointer]:
              - generic [ref=e282]: DEVILLED MUSHROOMS
            - button "DEVILLED PRAWNS" [ref=e283] [cursor=pointer]:
              - generic [ref=e284]: DEVILLED PRAWNS
            - button "DEVILLED PRAWNS" [ref=e285] [cursor=pointer]:
              - generic [ref=e286]: DEVILLED PRAWNS
            - button "DHALL CURRY" [ref=e287] [cursor=pointer]:
              - generic [ref=e288]: DHALL CURRY
            - button "DINNER BUFFET (FULL)" [ref=e289] [cursor=pointer]:
              - generic [ref=e290]: DINNER BUFFET (FULL)
            - button "DINNER BUFFET (HALF)" [ref=e291] [cursor=pointer]:
              - generic [ref=e292]: DINNER BUFFET (HALF)
            - button "DINNER BUFFET (HALF)" [ref=e293] [cursor=pointer]:
              - generic [ref=e294]: DINNER BUFFET (HALF)
            - button "EGG FRIED RICE" [ref=e295] [cursor=pointer]:
              - generic [ref=e296]: EGG FRIED RICE
            - button "EGG GARLIC SOUP" [ref=e297] [cursor=pointer]:
              - generic [ref=e298]: EGG GARLIC SOUP
            - button "EGG NOODLES" [ref=e299] [cursor=pointer]:
              - generic [ref=e300]: EGG NOODLES
            - button "F/FISH WITH BOILED VEG" [ref=e301] [cursor=pointer]:
              - generic [ref=e302]: F/FISH WITH BOILED VEG
            - button "F/FISH WITH CHIPS & SALAD" [ref=e303] [cursor=pointer]:
              - generic [ref=e304]: F/FISH WITH CHIPS & SALAD
            - button "F/FISH WITH POTATO WAGES" [ref=e305] [cursor=pointer]:
              - generic [ref=e306]: F/FISH WITH POTATO WAGES
            - button "FISH 1" [ref=e307] [cursor=pointer]:
              - generic [ref=e308]: FISH 1
            - button "FISH CHOPSUEY RICE" [ref=e309] [cursor=pointer]:
              - generic [ref=e310]: FISH CHOPSUEY RICE
            - button "FISH CURRY" [ref=e311] [cursor=pointer]:
              - generic [ref=e312]: FISH CURRY
            - button "FISH CURRY CUP" [ref=e313] [cursor=pointer]:
              - generic [ref=e314]: FISH CURRY CUP
            - button "FISH FINGER" [ref=e315] [cursor=pointer]:
              - generic [ref=e316]: FISH FINGER
            - button "FISH FINGER (FREE)" [ref=e317] [cursor=pointer]:
              - generic [ref=e318]: FISH FINGER (FREE)
            - button "FISH FINGER 1KG" [ref=e319] [cursor=pointer]:
              - generic [ref=e320]: FISH FINGER 1KG
            - button "FISH FRIED RICE" [ref=e321] [cursor=pointer]:
              - generic [ref=e322]: FISH FRIED RICE
            - button "FISH NOODLES" [ref=e323] [cursor=pointer]:
              - generic [ref=e324]: FISH NOODLES
            - button "FISH STEW" [ref=e325] [cursor=pointer]:
              - generic [ref=e326]: FISH STEW
            - button "FRIED BEEF" [ref=e327] [cursor=pointer]:
              - generic [ref=e328]: FRIED BEEF
            - button "FRIED CHICKEN" [ref=e329] [cursor=pointer]:
              - generic [ref=e330]: FRIED CHICKEN
            - button "FRIED EGG" [ref=e331] [cursor=pointer]:
              - generic [ref=e332]: FRIED EGG
            - button "FRIED FISH" [ref=e333] [cursor=pointer]:
              - generic [ref=e334]: FRIED FISH
            - button "FRIED GARLIC" [ref=e335] [cursor=pointer]:
              - generic [ref=e336]: FRIED GARLIC
            - button "FRIED MUTTON" [ref=e337] [cursor=pointer]:
              - generic [ref=e338]: FRIED MUTTON
            - button "FRIED PORK" [ref=e339] [cursor=pointer]:
              - generic [ref=e340]: FRIED PORK
            - button "FRIED PRAWNS" [ref=e341] [cursor=pointer]:
              - generic [ref=e342]: FRIED PRAWNS
            - button "FRIED SAUSAGES" [ref=e343] [cursor=pointer]:
              - generic [ref=e344]: FRIED SAUSAGES
            - button "FRUIT PLATE (L)" [ref=e345] [cursor=pointer]:
              - generic [ref=e346]: FRUIT PLATE (L)
            - button "FRUIT PLATE (M)" [ref=e347] [cursor=pointer]:
              - generic [ref=e348]: FRUIT PLATE (M)
            - button "FRUIT PLATE (S)" [ref=e349] [cursor=pointer]:
              - generic [ref=e350]: FRUIT PLATE (S)
            - button "FRUIT SALAD" [ref=e351] [cursor=pointer]:
              - generic [ref=e352]: FRUIT SALAD
            - button "FRUIT SALADS WITH ICE CREAM" [ref=e353] [cursor=pointer]:
              - generic [ref=e354]: FRUIT SALADS WITH ICE CREAM
            - button "FULL FISH" [ref=e355] [cursor=pointer]:
              - generic [ref=e356]: FULL FISH
            - button "GARLIC KANKUN" [ref=e357] [cursor=pointer]:
              - generic [ref=e358]: GARLIC KANKUN
            - button "GAROUPA FISH 1KG" [ref=e359] [cursor=pointer]:
              - generic [ref=e360]: GAROUPA FISH 1KG
            - button "GIDE LUNCH" [ref=e361] [cursor=pointer]:
              - generic [ref=e362]: GIDE LUNCH
            - button "GLASS NOODLES CHICKEN" [ref=e363] [cursor=pointer]:
              - generic [ref=e364]: GLASS NOODLES CHICKEN
            - button "GLASS NOODLES MIX" [ref=e365] [cursor=pointer]:
              - generic [ref=e366]: GLASS NOODLES MIX
            - button "GLASS NOODLES SEAFOOD" [ref=e367] [cursor=pointer]:
              - generic [ref=e368]: GLASS NOODLES SEAFOOD
            - button "GLASS NOODLESS EGG" [ref=e369] [cursor=pointer]:
              - generic [ref=e370]: GLASS NOODLESS EGG
            - button "GRILLED BEEF" [ref=e371] [cursor=pointer]:
              - generic [ref=e372]: GRILLED BEEF
            - button "GRILLED CHICKEN" [ref=e373] [cursor=pointer]:
              - generic [ref=e374]: GRILLED CHICKEN
            - button "GRILLED CRAB" [ref=e375] [cursor=pointer]:
              - generic [ref=e376]: GRILLED CRAB
            - button "GRILLED FISH" [ref=e377] [cursor=pointer]:
              - generic [ref=e378]: GRILLED FISH
            - button "GRILLED LAMB" [ref=e379] [cursor=pointer]:
              - generic [ref=e380]: GRILLED LAMB
            - button "GRILLED PORK" [ref=e381] [cursor=pointer]:
              - generic [ref=e382]: GRILLED PORK
            - button "GRILLED SAUSAGES" [ref=e383] [cursor=pointer]:
              - generic [ref=e384]: GRILLED SAUSAGES
            - button "HAM CHEESE TOMATO OMLET" [ref=e385] [cursor=pointer]:
              - generic [ref=e386]: HAM CHEESE TOMATO OMLET
            - button "HEDELLA FISH" [ref=e387] [cursor=pointer]:
              - generic [ref=e388]: HEDELLA FISH
            - button "HOT BATTER PRAWNS" [ref=e389] [cursor=pointer]:
              - generic [ref=e390]: HOT BATTER PRAWNS
            - button "HOT BUTTER CUTTLE FISH" [ref=e391] [cursor=pointer]:
              - generic [ref=e392]: HOT BUTTER CUTTLE FISH
            - button "HOT BUTTER MUSHROOM" [ref=e393] [cursor=pointer]:
              - generic [ref=e394]: HOT BUTTER MUSHROOM
            - button "HOT BUTTER MUSHROOMS" [ref=e395] [cursor=pointer]:
              - generic [ref=e396]: HOT BUTTER MUSHROOMS
            - button "ICE CREAM" [ref=e397] [cursor=pointer]:
              - generic [ref=e398]: ICE CREAM
            - button "ICE CREAM CUP" [ref=e399] [cursor=pointer]:
              - generic [ref=e400]: ICE CREAM CUP
            - button "JUMBO PRAWNS" [ref=e401] [cursor=pointer]:
              - generic [ref=e402]: JUMBO PRAWNS
            - button "JUMBO PRAWNS (M)" [ref=e403] [cursor=pointer]:
              - generic [ref=e404]: JUMBO PRAWNS (M)
            - button "JUMBO PRAWNS WITH CHIPS & SALAD" [ref=e405] [cursor=pointer]:
              - generic [ref=e406]: JUMBO PRAWNS WITH CHIPS & SALAD
            - button "JUMBO PRAWNS XL" [ref=e407] [cursor=pointer]:
              - generic [ref=e408]: JUMBO PRAWNS XL
            - button "JUMBO SAUSAGES" [ref=e409] [cursor=pointer]:
              - generic [ref=e410]: JUMBO SAUSAGES
            - button "KANKUN BEEF" [ref=e411] [cursor=pointer]:
              - generic [ref=e412]: KANKUN BEEF
            - button "KANKUN DEVELED" [ref=e413] [cursor=pointer]:
              - generic [ref=e414]: KANKUN DEVELED
            - button "KOROKKE ( FISH )" [ref=e415] [cursor=pointer]:
              - generic [ref=e416]: KOROKKE ( FISH )
            - button "KOROKKE ( PORK )" [ref=e417] [cursor=pointer]:
              - generic [ref=e418]: KOROKKE ( PORK )
            - button "LOBSTER (L) 100G" [ref=e419] [cursor=pointer]:
              - generic [ref=e420]: LOBSTER (L) 100G
            - button "LOBSTER (M) 100G" [ref=e421] [cursor=pointer]:
              - generic [ref=e422]: LOBSTER (M) 100G
            - button "LUNCH" [ref=e423] [cursor=pointer]:
              - generic [ref=e424]: LUNCH
            - button "LUNCH BUFFET (FULL)" [ref=e425] [cursor=pointer]:
              - generic [ref=e426]: LUNCH BUFFET (FULL)
            - button "LUNCH BUFFET (HALF)" [ref=e427] [cursor=pointer]:
              - generic [ref=e428]: LUNCH BUFFET (HALF)
            - button "LUNCH BUFFET (VEG)" [ref=e429] [cursor=pointer]:
              - generic [ref=e430]: LUNCH BUFFET (VEG)
            - button "LYCHEES WITH ICE CREAM" [ref=e431] [cursor=pointer]:
              - generic [ref=e432]: LYCHEES WITH ICE CREAM
            - button "LYCHEES WITH ICE CREAM" [ref=e433] [cursor=pointer]:
              - generic [ref=e434]: LYCHEES WITH ICE CREAM
            - button "MACARONI" [ref=e435] [cursor=pointer]:
              - generic [ref=e436]: MACARONI
            - button "MEEGORENG 1" [ref=e437] [cursor=pointer]:
              - generic [ref=e438]: MEEGORENG 1
            - button "MIE GORENG" [ref=e439] [cursor=pointer]:
              - generic [ref=e440]: MIE GORENG
            - button "MILK RICE" [ref=e441] [cursor=pointer]:
              - generic [ref=e442]: MILK RICE
            - button "MIXED CHOPSUEY NOODLES" [ref=e443] [cursor=pointer]:
              - generic [ref=e444]: MIXED CHOPSUEY NOODLES
            - button "MIXED CHOPSUEY RICE" [ref=e445] [cursor=pointer]:
              - generic [ref=e446]: MIXED CHOPSUEY RICE
            - button "MIXED FRIED RICE" [ref=e447] [cursor=pointer]:
              - generic [ref=e448]: MIXED FRIED RICE
            - button "MIXED GRILLED" [ref=e449] [cursor=pointer]:
              - generic [ref=e450]: MIXED GRILLED
            - button "MIXED GRILLED (SEA FOOD)" [ref=e451] [cursor=pointer]:
              - generic [ref=e452]: MIXED GRILLED (SEA FOOD)
            - button "MIXED NOODLES" [ref=e453] [cursor=pointer]:
              - generic [ref=e454]: MIXED NOODLES
            - button "MIXED VEGETABLE SALAD" [ref=e455] [cursor=pointer]:
              - generic [ref=e456]: MIXED VEGETABLE SALAD
            - button "MONGOLIAN FRIED RICE" [ref=e457] [cursor=pointer]:
              - generic [ref=e458]: MONGOLIAN FRIED RICE
            - button "MUSHROOM CURRY" [ref=e459] [cursor=pointer]:
              - generic [ref=e460]: MUSHROOM CURRY
            - button "MUSSELS HALF SHELL" [ref=e461] [cursor=pointer]:
              - generic [ref=e462]: MUSSELS HALF SHELL
            - button "MUTTON CURRY" [ref=e463] [cursor=pointer]:
              - generic [ref=e464]: MUTTON CURRY
            - button "MUTTON SOUP" [ref=e465] [cursor=pointer]:
              - generic [ref=e466]: MUTTON SOUP
            - button "MUTTON STEW" [ref=e467] [cursor=pointer]:
              - generic [ref=e468]: MUTTON STEW
            - button "NAPOLIAN SPEGHETTI" [ref=e469] [cursor=pointer]:
              - generic [ref=e470]: NAPOLIAN SPEGHETTI
            - button "NASI GORENG" [ref=e471] [cursor=pointer]:
              - generic [ref=e472]: NASI GORENG
            - button "OMELET FREE" [ref=e473] [cursor=pointer]:
              - generic [ref=e474]: OMELET FREE
            - button "ONION" [ref=e475] [cursor=pointer]:
              - generic [ref=e476]: ONION
            - button "PIZZA CHICKEN" [ref=e477] [cursor=pointer]:
              - generic [ref=e478]: PIZZA CHICKEN
            - button "PIZZA MIXED" [ref=e479] [cursor=pointer]:
              - generic [ref=e480]: PIZZA MIXED
            - button "PIZZA SEA FOOD" [ref=e481] [cursor=pointer]:
              - generic [ref=e482]: PIZZA SEA FOOD
            - button "PIZZA VEGETABLE" [ref=e483] [cursor=pointer]:
              - generic [ref=e484]: PIZZA VEGETABLE
            - button "PLAIN MACARONI" [ref=e485] [cursor=pointer]:
              - generic [ref=e486]: PLAIN MACARONI
            - button "PLAIN SPEGHETTI" [ref=e487] [cursor=pointer]:
              - generic [ref=e488]: PLAIN SPEGHETTI
            - button "POLSAMBOL" [ref=e489] [cursor=pointer]:
              - generic [ref=e490]: POLSAMBOL
            - button "PORK BACON" [ref=e491] [cursor=pointer]:
              - generic [ref=e492]: PORK BACON
            - button "PORK CURRY" [ref=e493] [cursor=pointer]:
              - generic [ref=e494]: PORK CURRY
            - button "PORK MACARONI" [ref=e495] [cursor=pointer]:
              - generic [ref=e496]: PORK MACARONI
            - button "PORK RIBS" [ref=e497] [cursor=pointer]:
              - generic [ref=e498]: PORK RIBS
            - button "PORK STEW" [ref=e499] [cursor=pointer]:
              - generic [ref=e500]: PORK STEW
            - button "POTATO WEDGES" [ref=e501] [cursor=pointer]:
              - generic [ref=e502]: POTATO WEDGES
            - button "PRAWNS CURRY" [ref=e503] [cursor=pointer]:
              - generic [ref=e504]: PRAWNS CURRY
            - button "PRAWNS FRIED RICE" [ref=e505] [cursor=pointer]:
              - generic [ref=e506]: PRAWNS FRIED RICE
            - button "PRAWNS NOODLES" [ref=e507] [cursor=pointer]:
              - generic [ref=e508]: PRAWNS NOODLES
            - button "PRAWNS SPEGHETTI" [ref=e509] [cursor=pointer]:
              - generic [ref=e510]: PRAWNS SPEGHETTI
            - button "PRAWNS STEW" [ref=e511] [cursor=pointer]:
              - generic [ref=e512]: PRAWNS STEW
            - button "RH SPECIAL NOODLES" [ref=e513] [cursor=pointer]:
              - generic [ref=e514]: RH SPECIAL NOODLES
            - button "RH SPECIAL RICE" [ref=e515] [cursor=pointer]:
              - generic [ref=e516]: RH SPECIAL RICE
            - button "RICE & CURRY PKT (CHI)" [ref=e517] [cursor=pointer]:
              - generic [ref=e518]: RICE & CURRY PKT (CHI)
            - button "RICE & CURRY PKT (EGG)" [ref=e519] [cursor=pointer]:
              - generic [ref=e520]: RICE & CURRY PKT (EGG)
            - button "RICE & CURRY PKT (FISH)" [ref=e521] [cursor=pointer]:
              - generic [ref=e522]: RICE & CURRY PKT (FISH)
            - button "RICE & CURRY PKT (STAFF)" [ref=e523] [cursor=pointer]:
              - generic [ref=e524]: RICE & CURRY PKT (STAFF)
            - button "RICE & CURRY PKT (VEG)" [ref=e525] [cursor=pointer]:
              - generic [ref=e526]: RICE & CURRY PKT (VEG)
            - button "RICE & CURRY PKT FULL" [ref=e527] [cursor=pointer]:
              - generic [ref=e528]: RICE & CURRY PKT FULL
            - button "RO/BEEF WITH BOILED VEG" [ref=e529] [cursor=pointer]:
              - generic [ref=e530]: RO/BEEF WITH BOILED VEG
            - button "RO/BEEF WITH CHIPS & SALAD" [ref=e531] [cursor=pointer]:
              - generic [ref=e532]: RO/BEEF WITH CHIPS & SALAD
            - button "RO/CHI WITH BOILED VEG." [ref=e533] [cursor=pointer]:
              - generic [ref=e534]: RO/CHI WITH BOILED VEG.
            - button "RO/CHI WITH CHIPS & SALAD" [ref=e535] [cursor=pointer]:
              - generic [ref=e536]: RO/CHI WITH CHIPS & SALAD
            - button "RO/PORK WITH BOILED VEG" [ref=e537] [cursor=pointer]:
              - generic [ref=e538]: RO/PORK WITH BOILED VEG
            - button "RO/PORK WITH CHIPS & SALAD" [ref=e539] [cursor=pointer]:
              - generic [ref=e540]: RO/PORK WITH CHIPS & SALAD
            - button "ROAST CHICKEN (FULL)" [ref=e541] [cursor=pointer]:
              - generic [ref=e542]: ROAST CHICKEN (FULL)
            - button "S/R BREAKFAST" [ref=e543] [cursor=pointer]:
              - generic [ref=e544]: S/R BREAKFAST
            - button "S/R BREAKFAST HALF" [ref=e545] [cursor=pointer]:
              - generic [ref=e546]: S/R BREAKFAST HALF
            - button "S/R OMELET" [ref=e547] [cursor=pointer]:
              - generic [ref=e548]: S/R OMELET
            - button "SEA FOOD BATTERD" [ref=e549] [cursor=pointer]:
              - generic [ref=e550]: SEA FOOD BATTERD
            - button "SEA FOOD CHOPSUEY NOODLES" [ref=e551] [cursor=pointer]:
              - generic [ref=e552]: SEA FOOD CHOPSUEY NOODLES
            - button "SEA FOOD CHOPSUEY RICE" [ref=e553] [cursor=pointer]:
              - generic [ref=e554]: SEA FOOD CHOPSUEY RICE
            - button "SEA FOOD NOODLES" [ref=e555] [cursor=pointer]:
              - generic [ref=e556]: SEA FOOD NOODLES
            - button "SEA FOOD RICE" [ref=e557] [cursor=pointer]:
              - generic [ref=e558]: SEA FOOD RICE
            - button "SEA FOOD SALAD" [ref=e559] [cursor=pointer]:
              - generic [ref=e560]: SEA FOOD SALAD
            - button "SEA FOOD SOUP" [ref=e561] [cursor=pointer]:
              - generic [ref=e562]: SEA FOOD SOUP
            - button "SEAFOOD MACARONI" [ref=e563] [cursor=pointer]:
              - generic [ref=e564]: SEAFOOD MACARONI
            - button "SEAFOOD SPEGHETTI" [ref=e565] [cursor=pointer]:
              - generic [ref=e566]: SEAFOOD SPEGHETTI
            - button "SEER FISH BATTERED" [ref=e567] [cursor=pointer]:
              - generic [ref=e568]: SEER FISH BATTERED
            - button "SEER FISH CURRY" [ref=e569] [cursor=pointer]:
              - generic [ref=e570]: SEER FISH CURRY
            - button "SEER FISH DEVILED" [ref=e571] [cursor=pointer]:
              - generic [ref=e572]: SEER FISH DEVILED
            - button "SEER FISH FRIED" [ref=e573] [cursor=pointer]:
              - generic [ref=e574]: SEER FISH FRIED
            - button "SIZZLING BEEF" [ref=e575] [cursor=pointer]:
              - generic [ref=e576]: SIZZLING BEEF
            - button "SIZZLING CHICKEN" [ref=e577] [cursor=pointer]:
              - generic [ref=e578]: SIZZLING CHICKEN
            - button "SIZZLING CUTTLE FISH" [ref=e579] [cursor=pointer]:
              - generic [ref=e580]: SIZZLING CUTTLE FISH
            - button "SIZZLING PORK" [ref=e581] [cursor=pointer]:
              - generic [ref=e582]: SIZZLING PORK
            - button "SIZZLING PRAWNS" [ref=e583] [cursor=pointer]:
              - generic [ref=e584]: SIZZLING PRAWNS
            - button "SIZZLING SEAFOOD BUCKET" [ref=e585] [cursor=pointer]:
              - generic [ref=e586]: SIZZLING SEAFOOD BUCKET
            - button "SIZZLING SEAFOOD BUCKET" [ref=e587] [cursor=pointer]:
              - generic [ref=e588]: SIZZLING SEAFOOD BUCKET
            - button "SIZZLING SOYA BEEF" [ref=e589] [cursor=pointer]:
              - generic [ref=e590]: SIZZLING SOYA BEEF
            - button "SIZZLING SOYA CUTTLEFISH" [ref=e591] [cursor=pointer]:
              - generic [ref=e592]: SIZZLING SOYA CUTTLEFISH
            - button "SIZZLING SOYA FISH" [ref=e593] [cursor=pointer]:
              - generic [ref=e594]: SIZZLING SOYA FISH
            - button "SIZZLING SOYA MUTTEN" [ref=e595] [cursor=pointer]:
              - generic [ref=e596]: SIZZLING SOYA MUTTEN
            - button "SIZZLING SOYA MUTTEN" [ref=e597] [cursor=pointer]:
              - generic [ref=e598]: SIZZLING SOYA MUTTEN
            - button "SIZZLING SOYA PORK" [ref=e599] [cursor=pointer]:
              - generic [ref=e600]: SIZZLING SOYA PORK
            - button "SIZZLING SOYA PRAWNS" [ref=e601] [cursor=pointer]:
              - generic [ref=e602]: SIZZLING SOYA PRAWNS
            - button "SOUP NOODLES" [ref=e603] [cursor=pointer]:
              - generic [ref=e604]: SOUP NOODLES
            - button "SPAGETTI CHICKEN" [ref=e605] [cursor=pointer]:
              - generic [ref=e606]: SPAGETTI CHICKEN
            - button "SPAGHETTI" [ref=e607] [cursor=pointer]:
              - generic [ref=e608]: SPAGHETTI
            - button "SPAGHETTI SEA FOOD" [ref=e609] [cursor=pointer]:
              - generic [ref=e610]: SPAGHETTI SEA FOOD
            - button "SPRINACH WITH OYSTER SAUSE" [ref=e611] [cursor=pointer]:
              - generic [ref=e612]: SPRINACH WITH OYSTER SAUSE
            - button "SPRING ROLLES" [ref=e613] [cursor=pointer]:
              - generic [ref=e614]: SPRING ROLLES
            - button "STEAM RICE" [ref=e615] [cursor=pointer]:
              - generic [ref=e616]: STEAM RICE
            - button "SWEET & SOUR CHICKEN" [ref=e617] [cursor=pointer]:
              - generic [ref=e618]: SWEET & SOUR CHICKEN
            - button "SWEET & SOUR FISH" [ref=e619] [cursor=pointer]:
              - generic [ref=e620]: SWEET & SOUR FISH
            - button "SWEET & SOUR PRAWNA" [ref=e621] [cursor=pointer]:
              - generic [ref=e622]: SWEET & SOUR PRAWNA
            - button "THAI NOODLES" [ref=e623] [cursor=pointer]:
              - generic [ref=e624]: THAI NOODLES
            - button "THAI RICE" [ref=e625] [cursor=pointer]:
              - generic [ref=e626]: THAI RICE
            - button "TOMATO ONION SALAD" [ref=e627] [cursor=pointer]:
              - generic [ref=e628]: TOMATO ONION SALAD
            - button "TOM-YUM SOUP" [ref=e629] [cursor=pointer]:
              - generic [ref=e630]: TOM-YUM SOUP
            - button "VEGETABLE CHOPSUEY" [ref=e631] [cursor=pointer]:
              - generic [ref=e632]: VEGETABLE CHOPSUEY
            - button "VEGETABLE CHOPSUEY NOODLES" [ref=e633] [cursor=pointer]:
              - generic [ref=e634]: VEGETABLE CHOPSUEY NOODLES
            - button "VEGETABLE CHOPSUEY RICE" [ref=e635] [cursor=pointer]:
              - generic [ref=e636]: VEGETABLE CHOPSUEY RICE
            - button "VEGETABLE FRIED RICE" [ref=e637] [cursor=pointer]:
              - generic [ref=e638]: VEGETABLE FRIED RICE
            - button "VEGETABLE MACARONI" [ref=e639] [cursor=pointer]:
              - generic [ref=e640]: VEGETABLE MACARONI
            - button "VEGETABLE NOODLES" [ref=e641] [cursor=pointer]:
              - generic [ref=e642]: VEGETABLE NOODLES
            - button "VEGETABLE SOUP" [ref=e643] [cursor=pointer]:
              - generic [ref=e644]: VEGETABLE SOUP
            - button "VIP BUFFET LUNCH" [ref=e645] [cursor=pointer]:
              - generic [ref=e646]: VIP BUFFET LUNCH
            - button "WATTALAPPAN" [ref=e647] [cursor=pointer]:
              - generic [ref=e648]: WATTALAPPAN
            - button "WEDDING PACKAGE (BREAKFAST)" [ref=e649] [cursor=pointer]:
              - generic [ref=e650]: WEDDING PACKAGE (BREAKFAST)
            - button "WEDDING PACKAGE (DINNER)" [ref=e651] [cursor=pointer]:
              - generic [ref=e652]: WEDDING PACKAGE (DINNER)
            - button "WEDDING PACKAGE (LUNCH)" [ref=e653] [cursor=pointer]:
              - generic [ref=e654]: WEDDING PACKAGE (LUNCH)
            - button "WEDDING PACKAGE (LUNCH)" [ref=e655] [cursor=pointer]:
              - generic [ref=e656]: WEDDING PACKAGE (LUNCH)
            - button "YELLO RICE PKT" [ref=e657] [cursor=pointer]:
              - generic [ref=e658]: YELLO RICE PKT
            - button "YORGET" [ref=e659] [cursor=pointer]:
              - generic [ref=e660]: YORGET
  - dialog "Payment" [ref=e662]:
    - generic [ref=e665]:
      - generic [ref=e666]: Payment
      - button [ref=e669] [cursor=pointer]:
        - img [ref=e670]
    - generic [ref=e673]:
      - generic [ref=e674]:
        - generic [ref=e675]: Bill Total
        - generic [ref=e676]: 1,400.00
      - separator
      - generic [ref=e677]:
        - generic [ref=e678]:
          - generic [ref=e679]: Paid
          - generic [ref=e680]: "0.00"
        - generic [ref=e681]:
          - generic [ref=e682]: Balance
          - generic [ref=e683]: "0.00"
      - separator
      - generic [ref=e684]:
        - generic [ref=e685]:
          - button "ADVANCE STL" [active] [ref=e686] [cursor=pointer]
          - button "AMEX CARD" [ref=e687] [cursor=pointer]
          - button "CASH" [ref=e688] [cursor=pointer]
          - button "CHEQUE" [ref=e689] [cursor=pointer]
          - button "COMPLIMENTRY" [ref=e690] [cursor=pointer]
          - button "CREDIT" [ref=e691] [cursor=pointer]
          - button "MASTER CARD" [ref=e692] [cursor=pointer]
          - button "ONLINE PAYMENT" [ref=e693] [cursor=pointer]
          - button "ROOM CREDIT" [ref=e694] [cursor=pointer]
          - button "STAFF CREDIT" [ref=e695] [cursor=pointer]
          - button "VISA CARD" [ref=e696] [cursor=pointer]
        - generic [ref=e697]:
          - spinbutton "Enter amount" [ref=e699]
          - button "Add" [disabled] [ref=e701]:
            - generic [ref=e702]: Add
        - generic [ref=e703]:
          - button "1,450" [ref=e704] [cursor=pointer]
          - button "1,500" [ref=e705] [cursor=pointer]
          - button "1,600" [ref=e706] [cursor=pointer]
          - button "Exact" [ref=e707] [cursor=pointer]
    - generic [ref=e708]:
      - button "Cancel" [ref=e710] [cursor=pointer]:
        - generic [ref=e711]: Cancel
      - button "Clear Tender" [disabled] [ref=e713]:
        - generic [ref=e714]: Clear Tender
      - button "Complete Sale" [disabled] [ref=e716]:
        - generic [ref=e717]: Complete Sale
```

# Test source

```ts
  1   | import { test, expect } from 'playwright/test';
  2   | 
  3   | // PIN for cashier KUSAL
  4   | const CASHIER_PIN = '1026';
  5   | 
  6   | test('payment flow: login → table → add item → CASH payment → receipt → back to tables', async ({ page }) => {
  7   | 
  8   |   // Pre-seed terminal config so we skip the setup screen
  9   |   await page.addInitScript(() => {
  10  |     localStorage.setItem('rp_terminal', JSON.stringify({ locationId: 1, unitNo: 1 }));
  11  |   });
  12  | 
  13  |   await page.goto('/');
  14  | 
  15  |   // ── 1. Login via PIN numpad ─────────────────────────────────────────────
  16  |   await page.waitForSelector('.num-btn', { timeout: 10_000 });
  17  | 
  18  |   for (const digit of CASHIER_PIN.split('')) {
  19  |     // The zero button has class 'num-btn zero'; others are just 'num-btn'
  20  |     await page.locator('button.num-btn').filter({ hasText: new RegExp(`^${digit}$`) }).click();
  21  |   }
  22  | 
  23  |   await page.getByRole('button', { name: 'SIGN IN' }).click();
  24  | 
  25  |   // ── 2. Wait for POS to load (past login) ───────────────────────────────
  26  |   // Could land on location, tables, or directly on POS if already a session
  27  |   await page.waitForSelector('.sel-btn, .pb-tab, .order-empty', { timeout: 15_000 });
  28  | 
  29  |   // ── 3. Location selection (if shown) ──────────────────────────────────
  30  |   if (await page.locator('.location-btn').first().isVisible().catch(() => false)) {
  31  |     await page.locator('.location-btn').first().click();
  32  |   }
  33  | 
  34  |   // ── 4. Table selection ─────────────────────────────────────────────────
  35  |   await page.waitForSelector('.table-btn', { timeout: 8_000 });
  36  |   await page.locator('.table-btn').first().click();
  37  | 
  38  |   // ── 5. Ticket selection (if multiple tickets on table) ─────────────────
  39  |   const ticketStage = page.locator('.sel-tickets');
  40  |   if (await ticketStage.isVisible({ timeout: 3_000 }).catch(() => false)) {
  41  |     await page.locator('.new-ticket-btn').click();
  42  |   }
  43  | 
  44  |   // ── 6. Steward selection (if required for new ticket) ──────────────────
  45  |   const stewardBtn = page.locator('.steward-btn').first();
  46  |   if (await stewardBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
  47  |     await stewardBtn.click();
  48  |   }
  49  | 
  50  |   // ── 7. POS stage — add a menu item via product browser ─────────────────
  51  |   await page.waitForSelector('.pb-tab', { timeout: 10_000 });
  52  | 
  53  |   // Select first layer-1 tab
  54  |   await page.locator('.pb-tab').first().click();
  55  | 
  56  |   // Select first layer-2 category (may already be selected)
  57  |   const firstCat = page.locator('.pb-cat').first();
  58  |   if (await firstCat.isVisible({ timeout: 2_000 }).catch(() => false)) {
  59  |     await firstCat.click();
  60  |   }
  61  | 
  62  |   // Wait for and click the first product button
  63  |   await page.waitForSelector('.pb-item', { timeout: 6_000 });
  64  |   await page.locator('.pb-item').first().click();
  65  | 
  66  |   // ── 8. Verify item appears in order list ───────────────────────────────
  67  |   await page.waitForSelector('.order-item', { timeout: 8_000 });
  68  |   await expect(page.locator('.order-item').first()).toBeVisible();
  69  | 
  70  |   // ── 9. Open payment dialog ─────────────────────────────────────────────
  71  |   await page.locator('.ob-payment').click();
  72  |   await page.waitForSelector('.tender-type-btn', { timeout: 5_000 });
  73  | 
  74  |   // ── 10. Select CASH pay type ───────────────────────────────────────────
  75  |   const cashBtn = page.locator('.tender-type-btn').filter({ hasText: /cash/i });
  76  |   if (await cashBtn.count() > 0) {
  77  |     await cashBtn.first().click();
  78  |   } else {
  79  |     // Fall back to first available pay type
  80  |     await page.locator('.tender-type-btn').first().click();
  81  |   }
  82  | 
  83  |   // ── 11. Set amount (Exact button for cash, or auto-filled for others) ──
  84  |   const exactBtn = page.locator('.quick-btn.exact');
  85  |   if (await exactBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
  86  |     await exactBtn.click();
  87  |   }
  88  |   // If no exact button, the amount was pre-filled for non-cash pay types
  89  | 
  90  |   // ── 12. Click Add tender ───────────────────────────────────────────────
> 91  |   await page.getByRole('button', { name: 'Add' }).click();
      |                                                   ^ Error: locator.click: Test timeout of 60000ms exceeded.
  92  | 
  93  |   // Wait for tender line to appear
  94  |   await page.waitForSelector('.pay-line', { timeout: 5_000 });
  95  | 
  96  |   // ── 13. Wait for Complete Sale to enable ──────────────────────────────
  97  |   const completeSaleBtn = page.getByRole('button', { name: 'Complete Sale' });
  98  |   await expect(completeSaleBtn).toBeEnabled({ timeout: 6_000 });
  99  |   await completeSaleBtn.click();
  100 | 
  101 |   // ── 14. Receipt overlay should appear ─────────────────────────────────
  102 |   await page.waitForSelector('.receipt-overlay', { timeout: 10_000 });
  103 |   await expect(page.locator('.receipt-overlay')).toBeVisible();
  104 | 
  105 |   // ── 15. Close receipt → back to table selection ────────────────────────
  106 |   await page.locator('.rcp-btn.close').click();
  107 | 
  108 |   // Should be back at table selection
  109 |   await page.waitForSelector('.table-btn', { timeout: 8_000 });
  110 |   await expect(page.locator('.sel-title').filter({ hasText: /Select Table/i })).toBeVisible();
  111 | });
  112 | 
```