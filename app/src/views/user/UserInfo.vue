<template>
  <div class="user">
    <b-card :class="{skeleton: !user}">
      <template v-slot:header>
        <h2>{{ user ? user.fullname : '' }}</h2>
      </template>

      <div class="d-flex align-items-center">
        <icon iname="user" class="fa-fw" />

        <div class="w-100">
          <template v-if="user">
            <b-row>
              <b-col><strong>{{ $t('user_username') }}</strong></b-col>
              <b-col>{{ user.username }}</b-col>
            </b-row>

            <b-row>
              <b-col><strong>{{ $t('user_email') }}</strong></b-col>
              <b-col class="font-italic">
                {{ user.mail }}
              </b-col>
            </b-row>

            <b-row>
              <b-col><strong>{{ $t('user_mailbox_quota') }}</strong></b-col>
              <b-col>{{ user['mailbox-quota'].limit }}</b-col>
            </b-row>

            <b-row>
              <b-col><strong>{{ $t('user_mailbox_use') }}</strong></b-col>
              <b-col>{{ user['mailbox-quota'].use }}</b-col>
            </b-row>

            <b-row v-for="(trad, mailType) in {'mail-aliases': 'user_emailaliases', 'mail-forward': 'user_emailforward'}" :key="mailType">
              <b-col><strong>{{ $t(trad) }}</strong></b-col>

              <b-col v-if="user[mailType]">
                <ul v-if="user[mailType].length > 1">
                  <li v-for="(alias, index) in user[mailType]" :key="index">
                    {{ alias }}
                  </li>
                </ul>

                <template v-else-if="user[mailType][0]">
                  {{ user[mailType][0] }}
                </template>
              </b-col>
            </b-row>
          </template>

          <!-- skeleton -->
          <template v-else>
            <b-row v-for="(n, index) in 6" :key="index">
              <b-col>
                <strong class="rounded" />
              </b-col>

              <b-col>
                <span v-if="n <= 4" class="rounded" />
              </b-col>
            </b-row>
          </template>
        </div>
      </div>
      <template v-slot:footer>
        <div class="d-flex d-flex justify-content-end">
          <b-button :to="user ? {name: 'user-edit', params: {user: user}} : null"
                    :variant="user ? 'info' : 'dark'"
          >
            {{ user ? $t('user_username_edit', {name: user.username}) : '' }}
          </b-button>

          <b-button :variant="user ? 'danger' : 'dark'" class="ml-2" v-b-modal.delete-modal>
            {{ user ? $t('delete') : '' }}
          </b-button>
        </div>
      </template>
    </b-card>

    <b-modal
      v-if="user" id="delete-modal" centered
      header-bg-variant="danger" header-text-variant="light"
      :title="$t('confirm_delete', {name: user.username })"
      @ok="deleteUser"
    >
      <b-form-group>
        <template v-slot:description>
          <span class="bg-warning p-2 text-dark">
            <icon iname="exclamation-triangle" /> {{ $t('purge_user_data_warning') }}
          </span>
        </template>
        <b-form-checkbox v-model="purge" class="mb-3">
          {{ $t('purge_user_data_checkbox', {name: user.username}) }}
        </b-form-checkbox>
      </b-form-group>
    </b-modal>
  </div>
</template>

<script>

export default {
  name: 'UserInfo',
  props: {
    name: {
      type: String,
      required: true
    }
  },
  data () {
    return {
      purge: false
    }
  },
  computed: {
    user () {
      return this.$store.state.data.users_details[this.name]
    }
  },
  methods: {
    deleteUser () {
      const data = this.purge ? { purge: '' } : {}
      this.$store.dispatch('DELETE',
        { uri: 'users', param: this.name, data, storeKey: 'users_details' }
      ).then(() => {
        this.$router.push({ name: 'user-list' })
      })
    }
  },
  created () {
    this.$store.dispatch('FETCH',
      { uri: 'users', param: this.name, storeKey: 'users_details' }
    )
  }
}
</script>

<style lang="scss" scoped>
.card-body > div {
  flex-direction: column;
  @include media-breakpoint-up(md) {
      flex-direction: row;
  }
}

.icon.fa-user {
  font-size: 10rem;
  padding-right: 3rem;
  padding-left: 1.75rem;
}

.row {
  + .row {
      border-top: 1px solid #eee;
  }

  padding: .5rem;
}

.col {
  margin: 0;
}

ul {
  margin: 0;
  padding: 0;

  li {
    font-style: italic;
    list-style: none;
  }
}

.skeleton {
  opacity: 0.5;

  h2 {
    height: #{2 * 1.2}rem;
  }

  .col {
    & > * {
      display: block;
      background-color: $skeleton-color;
      height: 1.5rem;
      max-width: 8rem;
    }

    strong {
      max-width: 12rem;
    }
  }

  button {
    height: calc(2.25rem + 2px);
    width: 7rem;
  }
}
</style>