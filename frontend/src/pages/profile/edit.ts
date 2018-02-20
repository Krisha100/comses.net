import {Component, Prop} from 'vue-property-decorator'
import * as Vue from 'vue'
import Markdown from 'components/forms/markdown'
import Tagger from 'components/tagger'
import Input from 'components/forms/input'
import Datepicker from 'components/forms/datepicker';
import TextArea from 'components/forms/textarea'
import MessageDisplay from 'components/message_display'
import EditItems from 'components/edit_items'
import {ProfileAPI} from 'api'
import * as _ from 'lodash'
import {createFormValidator} from 'pages/form'
import {HandlerWithRedirect} from "handler";
import yup from 'yup'
import Checkbox from "components/forms/checkbox";

export const schema = yup.object().shape({
    given_name: yup.string().required(),
    family_name: yup.string().required(),
    email: yup.string().email().required(),
    research_interests: yup.string(),
    orcid_url: yup.string().url().nullable(),
    github_url: yup.string().url().nullable(),
    personal_url: yup.string().url(),
    professional_url: yup.string().url(),
    institution_name: yup.string().nullable(),
    institution_url: yup.string().url().nullable(),
    bio: yup.string(),
    degrees: yup.array().of(yup.string().required()),
    tags: yup.array().of(yup.object().shape({name: yup.string().required()})),
    full_member: yup.boolean().required(),
});

const api = new ProfileAPI();

@Component(<any>{
    template: `<form v-cloak>
        <div class='row'>
        <div class="form-group col-6">
            <h3>Profile image</h3>
            <label style='cursor: pointer; margin-top: -20px;' for='profileUpload' class="form-control-label">
            <img class='mt-3 d-block rounded img-fluid img-thumbnail' alt='Profile Image' v-if="state.avatar" :src="state.avatar">
            <img class='mt-3 d-block rounded img-fluid img-thumbnail' src='holder.js/150x150?text=Click to edit' v-else>
            </label>
            <input id='profileUpload' type="file" class="d-none form-control-file" @change="uploadImage">
        </div>

        <div class='form-group col-6'>
        <h3>Social authentication</h3>
        <ul class='list-group'>
        <li class='list-group-item'>
        <a target='_blank' href='https://orcid.org/'><span class='text-orcid ai ai-orcid'></span></a>
        <span v-if='orcid_url'>
            <a :href='orcid_url'>{{ orcid_url }}</a>
        </span>
        <span v-else>
            <a title='orcid' href='/accounts/orcid/login/?process=connect'>Connect your ORCID account</a>
        </span>
        </li>
        <li class='list-group-item'>
        <a target='_blank' href='https://github.com/'><span class='text-gray fa fa-github'></span></a>
        <span v-if='github_url'>
            <a :href='github_url'>{{ github_url }}</a>
        </span>
        <span v-else>
            <a title='github' href='/accounts/github/login/?process=connect'>Connect your GitHub account</a>
        </span>
        </li>
        </ul>
        </div>
        </div>

        <c-input v-model="given_name" name="given_name" :errorMsgs="errors.given_name" label="Given Name"
            :required="config.given_name">
        </c-input>
        <c-input v-model="family_name" name="family_name" :errorMsgs="errors.family_name" label="Family Name"
            :required="config.family_name">
        </c-input>
        <c-input v-model="email" name="email" :errorMsgs="errors.email" label="Email" :required="config.email"
            help="Email address changes require verifying your new email address by acknowledging a confirmation email">
        </c-input>
        <c-markdown v-model="bio" name="bio" :errorMsgs="errors.bio" label="Bio" :required="config.bio">
        </c-markdown>
        <c-markdown v-model="research_interests" name="research_interests" :errorMsgs="errors.research_interests"
            label="Research Interests" :required="config.research_interests">
        </c-markdown>

        <c-input type="url" v-model="personal_url" name="personal_url" :errorMsgs="errors.personal_url"
            label="Personal URL" help="A link to your personal computational modeling related website" :required="config.personal_url">
        </c-input>
        <c-input type="url" v-model="professional_url" name="professional_url" :errorMsgs="errors.professional_url"
                 label="Professional URL" help="A link to your institutional or professional profile page."
                 :required="config.professional_url">
        </c-input>
        <c-input v-model="institution_name" name="institution_name" :errorMsgs="errors.institution_name"
            label="Institution" help="Your primary institutional affiliation or place of work"
            :required="config.institution_name">
        </c-input>
        <c-input v-model="institution_url" name="institution_url" :errorMsgs="errors.institution_url"
            label="Institution URL" :required="config.institution_url">
        </c-input>
        <c-edit-degrees :value="degrees" @create="degrees.push($event)" @remove="degrees.splice($event, 1)"
            @modify="degrees.splice($event.index, 1, $event.value)" name="degrees" :errorMsgs="errors.degrees"
            label="Degrees" help="A list of degrees earned and their associated institutions, e.g., Ph.D., Anthropology, Arizona State University. Press enter after each degree to add them." :required="config.degrees">
        </c-edit-degrees>
        <c-tagger v-model="tags" name="tags" :errorMsgs="errors.tags" label="Keywords"
            :required="config.tags">
        </c-tagger>
        <c-checkbox v-if="!initial_full_member" :required="false" v-model="full_member" name="full_member" :errorMsgs="errors.full_member"
            label="Full Member">
            <div class="form-text text-muted" slot="help">
                By checking this box, I agree to the <a href="#" data-toggle="modal" data-target="#rightsAndResponsibilities">rights and responsibilities</a> of CoMSES Net full membership.
            </div>
        </c-checkbox>
        <c-message-display :messages="statusMessages">
        </c-message-display>
        <button type="button" class="mt-3 btn btn-primary" @click="createOrUpdateIfValid">Save</button>
    </form>`,
    components: {
        'c-checkbox': Checkbox,
        'c-markdown': Markdown,
        'c-message-display': MessageDisplay,
        'c-datepicker': Datepicker,
        'c-tagger': Tagger,
        'c-textarea': TextArea,
        'c-input': Input,
        'c-edit-degrees': EditItems,
    }
})
export default class EditProfile extends createFormValidator(schema) {
    @Prop()
    _pk: number | null;

    initial_full_member: boolean = true;

    detailPageUrl(state) {
        return api.detailUrl(state.user_pk);
    }

    detailUrlParams(state) {
        return state.user_pk;
    }

    initializeForm() {
        if (this._pk !== null) {
            return this.retrieve(this._pk)
        }
    }

    created() {
        this.initializeForm();
    }

    createOrUpdate() {
        return api.update(this.state.user_pk, new HandlerWithRedirect(this));
    }

    async createOrUpdateIfValid() {
        await this.validate();
        return this.createOrUpdate();
    }

    retrieve(pk: number) {
        return api.retrieve(pk).then(r => {
            this.state = r.data;
            this.initial_full_member = this.state.full_member;
        });
    }

    async uploadImage(event) {
        const file = event.target.files[0];
        const response = await api.uploadProfilePicture({pk: this._pk}, file);
        this.state.avatar = response.data;
    }

    get uploadImageURL() {
        return `${window.location.href}picture/`;
    }
}
