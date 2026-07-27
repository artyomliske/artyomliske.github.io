# Приёмник заявок

Форма на сайте не может отправить заявку в Telegram напрямую: для этого
нужен токен бота, а всё, что попадает в статику, попадает и к читателю.
Поэтому между ними стоит эта ручка — единственный кусок портфолио,
которому нужен сервер.

Пока `data-endpoint` у формы в `index.html` пуст, формы на странице нет:
остаются Telegram, телефон и почта. Форма появляется в тот момент, когда
в атрибут вписан адрес поднятого приёмника.

## Что понадобится

* бот в Telegram (`@BotFather`) — от него нужен токен;
* ваш `chat_id` — напишите боту и загляните в
  `https://api.telegram.org/bot<ТОКЕН>/getUpdates`;
* любой сервер с nginx и доменом по HTTPS: браузер не пустит форму
  с `https://` на `http://`.

## Локально

```bash
cd tools/lead-proxy
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
BOT_TOKEN=123:abc CHAT_ID=456 ORIGIN=http://localhost:8777 uvicorn main:app --port 8090
```

В `index.html` у формы поставить `data-endpoint="http://localhost:8090/lead"`
и проверить, что заявка доходит.

## На сервере

`systemd`-юнит (`/etc/systemd/system/lead-proxy.service`):

```ini
[Service]
WorkingDirectory=/srv/lead-proxy
Environment=BOT_TOKEN=123:abc
Environment=CHAT_ID=456
Environment=ORIGIN=https://artyomliske.github.io
ExecStart=/srv/lead-proxy/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8090
Restart=always

[Install]
WantedBy=multi-user.target
```

nginx:

```nginx
location /lead {
    proxy_pass http://127.0.0.1:8090/lead;
    proxy_set_header X-Real-IP $remote_addr;
}
```

После этого в `index.html`:

```html
<form class="lead" id="lead" data-endpoint="https://ваш-домен/lead" novalidate hidden>
```

`hidden` можно оставить — его снимает `main.js`, когда видит непустой адрес.

## Что уже предусмотрено

* **Ловушка.** Скрытое поле `website`: человек его не видит, спам-бот
  заполняет. Заполнено — заявка молча выбрасывается, боту отвечаем «ок».
* **Ограничение частоты.** Пять заявок с адреса в час (`RATE_LIMIT`).
  Счётчик в памяти процесса — перезапуск его обнуляет, и это нормально:
  задача не в бухгалтерии, а в том, чтобы форму не залили за минуту.
* **CORS.** Ручка отвечает только адресу из `ORIGIN`.
* **Никакого `parse_mode`.** Текст заявки уходит в Telegram как есть, и
  ни угловые скобки, ни звёздочки из чужого сообщения ничего не ломают.

Заявки нигде не хранятся: пришло в Telegram — и всё. Если понадобится
история, её проще завести в боте, а не здесь.
