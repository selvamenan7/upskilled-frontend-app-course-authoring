import React, {
  useCallback, useEffect, useMemo, useState, useContext,
} from 'react';
import { injectIntl, intlShape } from '@edx/frontend-platform/i18n';
import {
  CardGrid, Container, breakpoints, Form, ActionRow, AlertModal, Button,
} from '@edx/paragon';
import { useDispatch, useSelector } from 'react-redux';
import Responsive from 'react-responsive';
import { getAuthenticatedUser } from '@edx/frontend-platform/auth';
import { useModels } from '../../../generic/model-store';
import {
  selectApp, LOADED, LOADING,
  updateValidationStatus,
} from '../data/slice';
import AppCard from './AppCard';
import messages from './messages';
import FeaturesTable from './FeaturesTable';
import AppListNextButton from './AppListNextButton';
import Loading from '../../../generic/Loading';
import useIsOnSmallScreen from '../data/hook';
import { saveProviderConfig, fetchDiscussionSettings } from '../data/thunks';
import { PagesAndResourcesContext } from '../../PagesAndResourcesProvider';
import { discussionRestriction } from '../data/constants';

const AppList = ({ intl }) => {
  const dispatch = useDispatch();
  const { courseId } = useContext(PagesAndResourcesContext);
  const {
    appIds, featureIds, status, activeAppId, selectedAppId, enabled, postingRestrictions,
  } = useSelector(state => state.discussions);
  const [discussionEnabled, setDiscussionEnabled] = useState(enabled);
  const apps = useModels('apps', appIds);
  const features = useModels('features', featureIds);
  const isGlobalStaff = getAuthenticatedUser().administrator;
  const ltiProvider = !['openedx', 'legacy'].includes(activeAppId);
  const isOnSmallcreen = useIsOnSmallScreen();

  const showOneEdxProvider = useMemo(() => apps.filter(app => (
    activeAppId === 'openedx' ? app.id !== 'legacy' : app.id !== 'openedx'
  )), [activeAppId]);

  // This could be a bit confusing.  activeAppId is the ID of the app that is currently configured
  // according to the server.  selectedAppId is the ID of the app that we _want_ to configure here
  // in the UI.  The two don't always agree, and a selectedAppId may not yet be set when the app is
  // loaded.  This effect is responsible for setting a selected app based on the active app -
  // effectively defaulting to it - if a selected app hasn't been set yet.
  useEffect(() => {
    // If selectedAppId is not set, use activeAppId
    if (!selectedAppId) {
      dispatch(selectApp({ appId: activeAppId }));
    }
    dispatch(updateValidationStatus({ hasError: false }));
  }, [selectedAppId, activeAppId]);

  useEffect(() => {
    setDiscussionEnabled(enabled);
  }, [enabled]);

  useEffect(() => {
    if (!postingRestrictions) {
      dispatch(fetchDiscussionSettings(courseId, selectedAppId));
    }
  }, [courseId]);

  const handleSelectApp = useCallback((appId) => {
    dispatch(selectApp({ appId }));
  }, []);

  const updateSettings = useCallback((enabledDiscussion) => {
    dispatch(saveProviderConfig(
      courseId,
      selectedAppId,
      {
        enabled: enabledDiscussion,
        postingRestrictions:
        enabledDiscussion ? postingRestrictions : discussionRestriction.ENABLED,
      },
    ));
  }, [courseId, selectedAppId, postingRestrictions]);

  const handleClose = useCallback(() => {
    setDiscussionEnabled(enabled);
  }, [enabled]);

  const handleOk = useCallback(() => {
    setDiscussionEnabled(false);
    updateSettings(false);
  }, [updateSettings]);

  const handleChange = useCallback((e) => {
    const toggleVal = e.target.checked;
    setDiscussionEnabled(!toggleVal);
    if (!toggleVal) {
      updateSettings(!toggleVal);
    }
  }, [updateSettings]);

  if (!selectedAppId || status === LOADING) {
    return (
      <Loading />
    );
  }

  if (status === LOADED && apps.length === 0) {
    return (
      <Container className="mt-5">
        <p>{intl.formatMessage(messages.noApps)}</p>
      </Container>
    );
  }

  const showAppCard = (filteredApps) => filteredApps.map(app => (
    <AppCard
      key={app.id}
      app={app}
      selected={app.id === selectedAppId}
      onClick={handleSelectApp}
      features={features}
    />
  ));

  return (
    <div className="my-sm-4" data-testid="appList">
      <div className={!isOnSmallcreen ? 'd-flex flex-row justify-content-between align-items-center' : 'mb-4'}>
        <h3 className={isOnSmallcreen ? 'mb-3' : 'm-0'}>
          {intl.formatMessage(messages.heading)}
        </h3>
        <Form.Switch
          floatLabelLeft
          className="text-primary-500 align-items-center"
          labelClassName="line-height-24"
          onChange={handleChange}
          checked={!discussionEnabled}
          data-testId="hide-discussion"
        >
          Hide discussion tab
        </Form.Switch>
      </div>
      <CardGrid
        columnSizes={{
          xs: 12,
          sm: 6,
          lg: 4,
          xl: 4,
        }}
        className={!isOnSmallcreen && 'mt-5'}
      >
        {(isGlobalStaff || ltiProvider) ? showAppCard(apps) : showAppCard(showOneEdxProvider)}
      </CardGrid>
      <Responsive minWidth={breakpoints.small.minWidth}>
        <h3 className="my-sm-5 my-4">
          {intl.formatMessage(messages.supportedFeatures)}
        </h3>
        <div className="app-list-data-table">
          <FeaturesTable
            apps={apps}
            features={features}
          />
        </div>
      </Responsive>
      <AlertModal
        title={intl.formatMessage(messages.hideDiscussionTabTitle)}
        isOpen={enabled && !discussionEnabled}
        onClose={handleClose}
        isBlocking
        className="hide-discussion-modal"
        footerNode={(
          <ActionRow>
            <Button variant="link" className="text-decoration-none bg-black" onClick={handleClose}>Cancel</Button>
            <Button variant="primary" className="bg-primary-500 ml-1 rounded-0" onClick={handleOk}>OK</Button>
          </ActionRow>
        )}
      >
        <p className="bg-black">
          {intl.formatMessage(messages.hideDiscussionTabMessage)}
        </p>
      </AlertModal>
    </div>
  );
};

AppList.propTypes = {
  intl: intlShape.isRequired,
};

const IntlAppList = injectIntl(AppList);

IntlAppList.NextButton = AppListNextButton;

export default IntlAppList;
