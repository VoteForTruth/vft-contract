# vft-contract — смарт-контракты VFT

@../vft-meta/CLAUDE.md

Контракты на **Tolk**, сборка и тесты — **Acton** (`~/.acton/bin/acton`; Blueprint устарел
и Tact не поддерживается). Описание контрактов, сообщений и лимитов — в `README.md`.

## Команды

```bash
acton build                                       # компиляция
acton test                                        # 29 тестов (tests/vft.test.tolk)
acton test --coverage                             # покрытие
acton test --mutate --mutate-contract VftVote     # мутационное тестирование (92–95%)
acton check && acton fmt --check                  # линтер и формат
acton wrapper --all                               # Tolk-обёртки после изменения ABI
acton run wrappers-ts                             # TS-обёртки (wrappers-ts/) для индексатора и приложения
```

## Важное

- `contracts/types.tolk` — источник истины для хранилищ, сообщений, ошибок и лимитов.
  Изменения хранилищ и опкодов ломают индексатор и приложение — см. «Связи» в vft-meta.
- Statement и Vote деплоятся с каноническим «пустым» хранилищем, поэтому адрес зависит
  только от (parent, idx, pro) / (statement, owner). Не добавлять в начальное хранилище то,
  что неизвестно заранее.
- Геттеры — только плоские структуры.
- Опасные режимы отправки (`SEND_MODE_CARRY_ALL_BALANCE`, `SEND_MODE_DESTROY`) требуют
  комментария `// SAFETY:` — иначе `acton check` ругается (E016).
- В тестах treasury не списывает отправленную сумму со своего баланса: «потрачено» считать
  через `netCost` (см. тесты).
- Скрипты (`scripts/*.tolk`, `acton run *-testnet`) берут ввод из `VFT_*` переменных или
  интерактивно; сессия TON Connect — в `build/sessions/`.
