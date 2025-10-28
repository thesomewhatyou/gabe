# PostgreSQL

Here are some instructions for setting up PostgreSQL for use with Gabe.

### 1. Install PostgreSQL.

=== "Debian/Ubuntu"

    ```sh
    sudo apt-get install postgresql postgresql-client
    ```

=== "Fedora/RHEL"

    ```sh
    sudo dnf install postgresql postgresql-server
    ```

=== "Alpine"

    ```sh
    doas apk add postgresql
    ```

=== "Arch/Manjaro"

    ```sh
    sudo pacman -S postgresql
    ```

---

### 2. (Optional) Tune PostgreSQL.

[PGTune](https://pgtune.leopard.in.ua/) is a useful tool for generating configuration files for your PostgreSQL database. It is highly recommended that you generate a config using this tool as it can increase stability and performance.

---

### 3. Create the bot user and database.

When you install PostgreSQL, it'll create a new user on your system that acts as the "superuser" of the database. You'll need to run Postgres commands as this user; however, you can run a command as that user without switching to it by using `sudo`.

First, you'll need to create a user that the bot can interact with as well as the database itself:

```sh
sudo su - postgres -c "createuser gabe"
sudo su - postgres -c "createdb gabe"
```

Then, launch the PostgreSQL shell for the next few commands:

```sh
sudo -u postgres psql
```

If you want to give the user a password, you can do so like this:

```sql
ALTER USER gabe WITH PASSWORD 'new_password';
```

Once you're inside the shell, you'll need to make sure the bot owns the database and has permissions:

```sql
ALTER DATABASE gabe OWNER TO gabe;
```

You're done!

---

### Troubleshooting

If you get an error like `error: permission denied for table counts` when attempting to run the bot, try running these commands in the PostgreSQL shell:

```sql
\c gabe
GRANT ALL PRIVILEGES ON guilds TO gabe;
GRANT ALL PRIVILEGES ON counts TO gabe;
GRANT ALL PRIVILEGES ON tags TO gabe;
\q
```
